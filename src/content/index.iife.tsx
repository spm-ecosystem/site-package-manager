import { runModernizer, applyThemeGlobally, SiteManifest } from './modernizer';
import stylesText from './content.css?inline';

let activeManifest: SiteManifest | null = null;
let hasRunModernizer = false;

// Step 1: Apply global theme variables immediately to prevent page flashing
function applyThemeEarly() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['spm_global_enabled', 'spm_installed_themes', 'spm_active_themes', 'spm_theme_overrides'], (res) => {
      const globalEnabled = res.spm_global_enabled !== false;
      if (!globalEnabled) return;

      const domain = window.location.hostname;
      const activeThemeId = res.spm_active_themes ? res.spm_active_themes[domain] : null;
      if (!activeThemeId) return;

      const manifest: SiteManifest | null = res.spm_installed_themes ? res.spm_installed_themes[activeThemeId] : null;
      if (manifest) {
        activeManifest = manifest;
        // Merge user overrides
        const overrides = res.spm_theme_overrides?.[domain];
        if (overrides && manifest.theme?.cssVariables) {
          manifest.theme.cssVariables = { ...manifest.theme.cssVariables, ...overrides };
        }
        
        // Inject theme globally as early as possible
        if (manifest.theme?.cssVariables) {
          applyThemeGlobally(manifest.theme.cssVariables, manifest.theme.customStyles, manifest.theme.noticeSelector);
        }

        // Safe race check: if DOM is already parsed, run modernizer immediately
        if (document.readyState !== 'loading' && !hasRunModernizer) {
          hasRunModernizer = true;
          runModernizer(document, manifest, stylesText);
        }
      }
    });
  }
}

// Step 2: Fallback listener once DOM is ready
function runEngine() {
  if (activeManifest && !hasRunModernizer) {
    hasRunModernizer = true;
    runModernizer(document, activeManifest, stylesText);
  }
}

// Execute theme setup immediately at document_start
applyThemeEarly();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runEngine);
} else {
  runEngine();
}
