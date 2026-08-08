import { runModernizer, applyThemeGlobally, fetchRegistry, fetchThemeFiles, SiteManifest } from './modernizer';
import stylesText from './content.css?inline';

let hasRunModernizer = false;

function waitForDomToSettle(timeoutMs = 4000, idleMs = 700): Promise<void> {
  return new Promise((resolve) => {
    if (!document.body) {
      resolve();
      return;
    }

    let lastMutation = Date.now();
    const startedAt = Date.now();
    const observer = new MutationObserver(() => {
      lastMutation = Date.now();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });

    const interval = window.setInterval(() => {
      const now = Date.now();
      const isIdle = now - lastMutation >= idleMs;
      const timedOut = now - startedAt >= timeoutMs;

      if (isIdle || timedOut) {
        window.clearInterval(interval);
        observer.disconnect();
        resolve();
      }
    }, 150);
  });
}

async function captureRenderedDom(): Promise<string> {
  if (document.readyState === 'loading') {
    await new Promise<void>((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    });
  }

  await waitForDomToSettle();

  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, #spm-global-theme-styles, #spm-global-toast-host').forEach((el) => el.remove());
  clone.querySelectorAll('[data-spm-id]').forEach((el) => el.removeAttribute('data-spm-id'));

  const doctype = document.doctype
    ? `<!DOCTYPE ${document.doctype.name}>`
    : '<!DOCTYPE html>';

  return `${doctype}\n${clone.outerHTML}`;
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'SPM_SANDBOX_CAPTURE_DOM') return false;

    captureRenderedDom()
      .then((html) => sendResponse({ ok: true, html, url: window.location.href }))
      .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }));

    return true;
  });
}

async function init() {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return;
  }

  const domain = window.location.hostname;

  // 1. Retrieve all required keys from local storage
  const storageKeys = [
    'spm_global_enabled',
    'spm_dev_mode',
    `dev-draft-manifest:${domain}`,
    `dev-draft-css:${domain}`,
    'spm_gitops_url',
    'gitops_url',
    'gitops_registry',
    'gitops_registry_timestamp',
    `spm_pinned_package:${domain}`,
    `spm_pinned_version:${domain}`
  ];

  chrome.storage.local.get(storageKeys, async (res) => {
    const globalEnabled = res.spm_global_enabled !== false;
    if (!globalEnabled) {
      console.log('[SPM] Global enabled is false. Aborting modernizer.');
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
          const devCss = res[`dev-draft-css:${domain}`] || '';

          console.log('[SPM] Dev Mode active. Applying draft changes for:', domain);

          // Apply theme globally early to prevent flashing
          if (devManifest.theme?.cssVariables) {
            applyThemeGlobally(devManifest.theme.cssVariables, devManifest.theme.customStyles, devManifest.theme.noticeSelector);
          }

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
          return;
        } catch (err) {
          console.error('[SPM] Error loading Dev Mode draft files:', err);
        }
      }
    }

    // 3. Dev Mode is off, look up registry.json in storage (refreshing if older than 1 hour)
    const gitopsUrl = res.spm_gitops_url || res.gitops_url || 'https://github.com/watashi-00/site-package-manager';
    let registry = res.gitops_registry;
    const registryTimestamp = res.gitops_registry_timestamp || 0;
    const isRegistryStale = !registry || (Date.now() - registryTimestamp > 3600000);

    if (isRegistryStale) {
      try {
        console.log('[SPM] Registry missing or stale. Fetching fresh registry from:', gitopsUrl);
        registry = await fetchRegistry(gitopsUrl);
        chrome.storage.local.set({
          gitops_registry: registry,
          gitops_registry_timestamp: Date.now()
        });
      } catch (err) {
        console.error('[SPM] Failed to fetch registry from GitOps URL. Using cached registry fallback.', err);
      }
    }

    if (!registry) {
      console.error('[SPM] No registry config available. Aborting modernizer.');
      return;
    }

    // 4. Resolve the active package and version for current domain
    const domainConfig = registry[domain];
    if (!domainConfig) {
      console.log('[SPM] Domain is not registered in GitOps registry:', domain);
      return;
    }

    const defaultPkg = domainConfig.defaultPackage;
    const pinnedPkg = res[`spm_pinned_package:${domain}`] || defaultPkg;
    if (!pinnedPkg) {
      console.error('[SPM] No package resolved for domain:', domain);
      return;
    }

    const pkgInfo = domainConfig.packages?.[pinnedPkg];
    if (!pkgInfo) {
      console.error('[SPM] Package not found in registry:', pinnedPkg);
      return;
    }

    const activeVersion = res[`spm_pinned_version:${domain}`] || pkgInfo.activeVersion;
    if (!activeVersion) {
      console.error('[SPM] No active version found for package:', pinnedPkg);
      return;
    }

    // Resolve git ref
    let ref = 'master';
    if (pkgInfo.history && Array.isArray(pkgInfo.history)) {
      const historyEntry = pkgInfo.history.find((h: any) => h.version === activeVersion);
      if (historyEntry && historyEntry.ref) {
        ref = historyEntry.ref;
      }
    }

    // 5. Read manifest and CSS from cache
    const manifestCacheKey = `theme_manifest:${domain}:${pinnedPkg}:${activeVersion}`;
    const cssCacheKey = `theme_css:${domain}:${pinnedPkg}:${activeVersion}`;
    const cacheTimeKey = `theme_cache_time:${domain}:${pinnedPkg}:${activeVersion}`;

    const cachedManifest = res[manifestCacheKey];
    const cachedCss = res[cssCacheKey];
    const cachedTime = res[cacheTimeKey] || 0;

    const isCacheValid = cachedManifest && cachedCss && cachedTime && (Date.now() - cachedTime < 3600000);

    let manifestData = cachedManifest;
    let cssTextData = cachedCss;

    if (!isCacheValid) {
      try {
        console.log(`[SPM] Fetching theme ${pinnedPkg}@${activeVersion} from GitOps raw source...`);
        const fetched = await fetchThemeFiles(gitopsUrl, domain, pkgInfo.directory || pinnedPkg, ref);
        manifestData = fetched.manifest;
        cssTextData = fetched.cssText;

        // Save to cache
        const cacheUpdate: Record<string, any> = {};
        cacheUpdate[manifestCacheKey] = manifestData;
        cacheUpdate[cssCacheKey] = cssTextData;
        cacheUpdate[cacheTimeKey] = Date.now();
        chrome.storage.local.set(cacheUpdate);
      } catch (err) {
        console.error('[SPM] Failed to fetch package assets from GitOps source:', err);
        // Fallback to stale cache if we have it
        if (!manifestData || !cssTextData) {
          console.error('[SPM] No cached assets available as fallback. Aborting.');
          return;
        }
        console.log('[SPM] Using stale cached theme assets fallback.');
      }
    }

    // 6. Run early global styles and mount modernizer on DOM load
    if (manifestData.theme?.cssVariables) {
      applyThemeGlobally(manifestData.theme.cssVariables, manifestData.theme.customStyles, manifestData.theme.noticeSelector);
    }

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
  });
}

init().catch(err => {
  console.error('[SPM] Initialization failed:', err);
});
