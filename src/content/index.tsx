import { runModernizer, applyThemeGlobally, SiteManifest } from './modernizer';
import stylesText from './content.css?inline';

// Storage Orchestrator Loader
function initEngine() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['spm_global_enabled', 'spm_installed_themes', 'spm_active_themes', 'spm_theme_overrides'], (res) => {
      const globalEnabled = res.spm_global_enabled !== false;
      if (!globalEnabled) return;

      const domain = window.location.hostname;
      const activeThemeId = res.spm_active_themes ? res.spm_active_themes[domain] : null;
      if (!activeThemeId) return;

      const manifest: SiteManifest | null = res.spm_installed_themes ? res.spm_installed_themes[activeThemeId] : null;
      if (manifest) {
        // Merge user color overrides on top of manifest theme variables
        const overrides = res.spm_theme_overrides?.[domain];
        if (overrides && manifest.theme?.cssVariables) {
          manifest.theme.cssVariables = { ...manifest.theme.cssVariables, ...overrides };
        }
        
        // Inject theme globally for un-reconstructed elements (like sidebars on post pages)
        if (manifest.theme?.cssVariables) {
          applyThemeGlobally(manifest.theme.cssVariables, manifest.theme.customStyles);
        }

        // Run the main DOM injection engine
        runModernizer(document, manifest, stylesText);
      }
    });
  }
}

// Bootstrap content engine
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEngine);
} else {
  initEngine();
}
