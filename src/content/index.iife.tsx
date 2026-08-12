import { runModernizer, applyThemeGlobally, fetchThemeFiles, SiteManifest } from './modernizer';
import stylesText from './content.css?inline';
import { revealPage } from './engine';

const WORKER_ORIGIN = 'https://spm.hexacloud.net.br';

let hasRunModernizer = false;

async function init() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return;
  }

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

              const runDevEngine = () => {
                if (!hasRunModernizer) {
                  hasRunModernizer = true;
                  runModernizer(document, devManifest, stylesText, devCss);
                }
              };

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', runDevEngine);
              } else {
                runDevEngine();
              }
              resolve();
              return;
            } catch (err) {
              console.error('[SPM] Error loading Dev Mode draft files:', err);
              revealPage();
              resolve();
              return;
            }
          }
        }

        // 3. Dev Mode is off: resolve theme and version from edge Worker / pinned storage
        let pinnedPkg = res[`spm_pinned_package:${domain}`] || res.spm_active_packages?.[domain];
        let pinnedVer = (pinnedPkg && res.spm_pinned_versions?.[domain]?.[pinnedPkg]) || res[`spm_pinned_version:${domain}`];

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

        // 4. Fetch manifest JSON from edge Worker (with local caching)
        const manifestCacheKey = `theme_manifest:${domain}:${themeName}:${version}`;
        const cacheTimeKey = `theme_cache_time:${domain}:${themeName}:${version}`;

        const cacheRes = await new Promise<Record<string, any>>((resolve) => {
          chrome.storage.local.get([manifestCacheKey, cacheTimeKey], resolve);
        });
        const cachedManifest = cacheRes[manifestCacheKey];
        const cachedTime = cacheRes[cacheTimeKey] || 0;
        const isCacheValid = cachedManifest && cachedTime && (Date.now() - cachedTime < 3600000);

        let manifestData: SiteManifest = cachedManifest;

        if (!isCacheValid) {
          try {
            console.log(`[SPM] Fetching theme ${themeName}@${version} from edge Worker...`);
            const fetched = await fetchThemeFiles(domain, themeName, version);
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

        const runEngine = () => {
          if (!hasRunModernizer) {
            hasRunModernizer = true;
            runModernizer(document, manifestData, stylesText, cssTextData);
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
