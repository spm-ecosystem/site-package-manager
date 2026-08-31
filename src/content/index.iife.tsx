import { runModernizer, applyThemeGlobally, fetchThemeFiles, SiteManifest } from './modernizer';
import stylesText from './content.css?inline';
import { revealPage } from './engine';

const WORKER_ORIGIN = 'https://spm.hexacloud.net.br';

let hasRunModernizer = false;

let modernizationTimeout: number | null = null;

function scheduleModernization(manifest: SiteManifest, cssText: string, isDev: boolean = false) {
  if (modernizationTimeout !== null) {
    clearTimeout(modernizationTimeout);
  }
  modernizationTimeout = window.setTimeout(() => {
    runModernizer(document, manifest, stylesText, cssText, isDev);
  }, 50);
}

declare global {
  interface Window {
    __spm_last_manifest?: SiteManifest;
    __spm_dev_manifest?: SiteManifest;
    __spm_observer_attached?: boolean;
  }
}

export function updateShadowStyleTags(cssVarsString: string, newCss: string = '', stylesTextVal = '') {
  const hosts = document.querySelectorAll('[class^="modern-reconstruct-host-"], [class^="modern-host-"], #spm-global-toast-host, #spm-dev-diagnostic-host');
  hosts.forEach((host) => {
    if (host.shadowRoot) {
      const styleTags = host.shadowRoot.querySelectorAll('style');
      let hasHostStyle = false;
      styleTags.forEach((styleTag) => {
        if (styleTag.hasAttribute('data-spm-vars')) {
          styleTag.textContent = `:host {\n${cssVarsString}\n}`;
          hasHostStyle = true;
        } else {
          styleTag.textContent = stylesTextVal + (newCss ? `\n/* Custom Theme Styles */\n${newCss}` : '');
        }
      });
      if (!hasHostStyle && cssVarsString) {
        const hostStyle = document.createElement('style');
        hostStyle.setAttribute('data-spm-vars', 'true');
        hostStyle.textContent = `:host {\n${cssVarsString}\n}`;
        host.shadowRoot.appendChild(hostStyle);
      }
    }
  });
}

async function init() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    const devManifest = window.__spm_dev_manifest;
    if (devManifest) {
      console.log('[SPM] Standalone Dev Mode active via window.__spm_dev_manifest');
      const cssVars = devManifest.theme?.cssVariables || {};
      const devCss = devManifest.theme?.customStyles || '';
      applyThemeGlobally(cssVars, devCss, devManifest.theme?.noticeSelector);
      runModernizer(document, devManifest, stylesText, devCss, true);
    }
    return;
  }

  try {
    document.documentElement.setAttribute('data-spm-extension-id', chrome.runtime.id);
  } catch (e) {}

  const domain = window.location.hostname;

  // 1. Retrieve required keys from local storage
  const storageKeys = [
    'spm_global_enabled',
    'spm_dev_mode',
    `dev-draft-manifest:${domain}`,
    `dev-draft-css:${domain}`,
    'spm_active_packages',
    'spm_pinned_versions',
    `spm_pinned_package:${domain}`,
    `spm_pinned_version:${domain}`,
    'spm_theme_overrides'
  ];

  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.get(storageKeys, async (res) => {
      try {
        const globalEnabled = res.spm_global_enabled !== false;
        if (!globalEnabled) {
          console.log('[SPM] Global enabled is false. Aborting modernizer.');
          revealPage();
          resolve();
          return;
        }

        // 2. Check Dev Mode draft bypass
        const isDevMode = res.spm_dev_mode === true || (res.spm_dev_mode && res.spm_dev_mode[domain] === true);
        if (isDevMode) {
          const devManifestRaw = res[`dev-draft-manifest:${domain}`];
          if (devManifestRaw) {
            try {
              const devManifest: SiteManifest = typeof devManifestRaw === 'string'
                ? JSON.parse(devManifestRaw)
                : devManifestRaw;
              const devCss = res[`dev-draft-css:${domain}`] || devManifest.theme?.customStyles || '';

              console.log('[SPM] Dev Mode active. Applying draft changes for:', domain);

              const userOverrides = res.spm_theme_overrides?.[domain] || {};
              const cssVars = { ...(devManifest.theme?.cssVariables || {}), ...userOverrides };

              applyThemeGlobally(cssVars, devCss, devManifest.theme?.noticeSelector);

              devManifest.theme = {
                ...devManifest.theme,
                cssVariables: cssVars
              };

              window.__spm_last_manifest = devManifest;

              const runDevEngine = () => {
                runModernizer(document, devManifest, stylesText, devCss, true);

                if (!window.__spm_observer_attached) {
                  window.__spm_observer_attached = true;
                  const observer = new MutationObserver((mutations) => {
                    let shouldRun = false;
                    for (const mutation of mutations) {
                      for (const node of Array.from(mutation.addedNodes)) {
                        if (node.nodeType === 1) {
                          const el = node as HTMLElement;
                          const className = typeof el.className === 'string' ? el.className : '';
                          if (!className.includes('modern-') && el.id !== 'spm-global-toast-host' && el.id !== 'spm-dev-diagnostic-host') {
                            shouldRun = true;
                            break;
                          }
                        }
                      }
                      if (shouldRun) break;
                    }
                    if (shouldRun) {
                      console.log('[SPM Engine] DOM mutation detected. Scheduling modernization...');
                      scheduleModernization(devManifest, devCss, true);
                    }
                  });

                  observer.observe(document.body || document.documentElement, {
                    childList: true,
                    subtree: true
                  });
                }
              };

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', runDevEngine);
              } else {
                runDevEngine();
              }
            } catch (err) {
              console.error('[SPM] Error loading Dev Mode draft files:', err);
            }
          }

          console.log('[SPM] Dev Mode active. Opening WebSocket connection to dev server...');

          let wsOpened = false;
          const wsTimeout = setTimeout(() => {
            if (!wsOpened && !devManifestRaw) {
              revealPage();
            }
          }, 2000);

          const ws = new WebSocket('ws://localhost:8080');

          ws.onopen = () => {
            wsOpened = true;
            clearTimeout(wsTimeout);
            console.log('[SPM] WebSocket connection opened.');
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('[SPM] Dev Server update received:', data);

              const devManifest = data.manifest;
              const devCss = data.css || '';

              chrome.storage.local.set({
                [`dev-draft-manifest:${domain}`]: JSON.stringify(devManifest),
                [`dev-draft-css:${domain}`]: devCss
              }, () => {
                window.__spm_last_manifest = devManifest;

                chrome.storage.local.get(['spm_theme_overrides'], (storageRes) => {
                  try {
                    const userOverrides = storageRes?.spm_theme_overrides?.[domain] || {};
                    const cssVars = { ...(devManifest?.theme?.cssVariables || {}), ...userOverrides };

                    applyThemeGlobally(cssVars, devCss, devManifest?.theme?.noticeSelector);

                    const cssVarsString = Object.entries(cssVars)
                      .map(([key, val]) => `${key}: ${val};`)
                      .join('\n');

                    updateShadowStyleTags(cssVarsString, devCss, stylesText);

                    // Re-run modernizer in-memory for instant 0-delay hot reload
                    if (devManifest) {
                      runModernizer(document, devManifest, stylesText, devCss, true);
                    }
                  } catch (err) {
                    console.error('[SPM] Error in storage callback:', err);
                  }
                });
              });
            } catch (err) {
              console.error('[SPM] Error processing WebSocket message:', err);
            }
          };

          ws.onerror = (err) => {
            console.warn('[SPM] WebSocket connection error (is dev server running?):', err);
            if (!devManifestRaw) {
              revealPage();
            }
          };

          ws.onclose = () => {
            console.log('[SPM] WebSocket connection closed.');
          };

          resolve();
          return;
        }

        // 3. Dev Mode is off: resolve theme and version from edge Worker / pinned storage
        let pinnedPkg = res[`spm_pinned_package:${domain}`] || res.spm_active_packages?.[domain];
        let pinnedVer = (pinnedPkg && res.spm_pinned_versions?.[domain]?.[pinnedPkg]) || (!pinnedPkg ? res[`spm_pinned_version:${domain}`] : undefined);

        let themeName = pinnedPkg;
        let version = pinnedVer;

        // If package or version is missing, fetch available themes for domain from Worker
        if (!themeName || !version) {
          try {
            const listRes = await fetch(`${WORKER_ORIGIN}/spm/v1/api/themes/${domain}`);
            if (!listRes.ok) {
              console.log('[SPM] Domain has no registered themes or fetch failed:', domain);
              revealPage();
              resolve();
              return;
            }
            const listData = await listRes.json();
            const themesList: Array<{ key: string, label: string, version: string, timestamp?: string }> = listData?.themes || [];
            if (themesList.length === 0) {
              console.log('[SPM] No themes returned for domain:', domain);
              revealPage();
              resolve();
              return;
            }

            // Determine themeName
            if (!themeName) {
              const firstKey = themesList[0].key || '';
              const parts = firstKey.split('/');
              themeName = parts.length >= 3 ? parts[2] : (firstKey || 'default');
            }

            // Determine version for themeName
            if (!version) {
              const matchingThemes = themesList.filter(t => {
                const parts = (t.key || '').split('/');
                const name = parts.length >= 3 ? parts[2] : t.key;
                return name === themeName;
              });
              const target = matchingThemes.length > 0 ? matchingThemes[matchingThemes.length - 1] : themesList[0];
              version = target?.version;
            }
          } catch (err) {
            console.error('[SPM] Error querying themes list from edge:', err);
            revealPage();
            resolve();
            return;
          }
        }

        if (!themeName || !version) {
          console.error('[SPM] Could not resolve active theme or version for:', domain);
          revealPage();
          resolve();
          return;
        }

        // 4. Fetch manifest JSON from edge Worker (with local caching & pinned integrity verification)
        const manifestCacheKey = `theme_manifest:${domain}:${themeName}:${version}`;
        const cacheTimeKey = `theme_cache_time:${domain}:${themeName}:${version}`;
        const pinnedIntegrityKey = `spm_pinned_integrity:${domain}:${themeName}:${version}`;
        const domainIntegrityKey = `spm_pinned_integrity:${domain}`;

        const cacheRes = await new Promise<Record<string, any>>((resolve) => {
          chrome.storage.local.get([manifestCacheKey, cacheTimeKey, pinnedIntegrityKey, domainIntegrityKey], resolve);
        });
        const cachedManifest = cacheRes[manifestCacheKey];
        const cachedTime = cacheRes[cacheTimeKey] || 0;
        const pinnedIntegrity = cacheRes[pinnedIntegrityKey] || cacheRes[domainIntegrityKey];
        const isCacheValid = cachedManifest && cachedTime && (Date.now() - cachedTime < 3600000);

        let manifestData: SiteManifest = cachedManifest;

        if (!isCacheValid) {
          try {
            console.log(`[SPM] Fetching theme ${themeName}@${version} from edge Worker...`);
            const fetched = await fetchThemeFiles(domain, themeName, version, pinnedIntegrity);
            manifestData = fetched.manifest;

            // Save to cache
            const cacheUpdate: Record<string, any> = {};
            cacheUpdate[manifestCacheKey] = manifestData;
            cacheUpdate[cacheTimeKey] = Date.now();
            chrome.storage.local.set(cacheUpdate);
          } catch (err) {
            console.error('[SPM] Failed to fetch theme manifest from edge Worker:', err);
            if (!manifestData) {
              console.error('[SPM] No cached manifest available as fallback. Aborting.');
              revealPage();
              resolve();
              return;
            }
            console.log('[SPM] Using stale cached theme manifest fallback.');
          }
        }

        const cssTextData = manifestData.theme?.customStyles || '';
        const userOverrides = res.spm_theme_overrides?.[domain] || {};
        const cssVars = { ...(manifestData.theme?.cssVariables || {}), ...userOverrides };

        // 5. Run early global styles and mount modernizer on DOM load
        applyThemeGlobally(cssVars, cssTextData, manifestData.theme?.noticeSelector);

        manifestData.theme = {
          ...manifestData.theme,
          cssVariables: cssVars
        };

        window.__spm_last_manifest = manifestData;

        const runEngine = () => {
          if (!hasRunModernizer) {
            hasRunModernizer = true;
            runModernizer(document, manifestData, stylesText, cssTextData);

            const observer = new MutationObserver((mutations) => {
              let shouldRun = false;
              for (const mutation of mutations) {
                for (const node of Array.from(mutation.addedNodes)) {
                  if (node.nodeType === 1) {
                    const el = node as HTMLElement;
                    const className = typeof el.className === 'string' ? el.className : '';
                    // Ignore changes inside our own shadow hosts and components
                    if (!className.includes('modern-') && el.id !== 'spm-global-toast-host' && el.id !== 'spm-dev-diagnostic-host') {
                      shouldRun = true;
                      break;
                    }
                  }
                }
                if (shouldRun) break;
              }
              if (shouldRun) {
                console.log('[SPM Engine] DOM mutation detected. Scheduling modernization...');
                scheduleModernization(manifestData, cssTextData);
              }
            });

            observer.observe(document.body || document.documentElement, {
              childList: true,
              subtree: true
            });
          }
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', runEngine);
        } else {
          runEngine();
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

init().catch(err => {
  console.error('[SPM] Initialization failed:', err);
  revealPage();
});

