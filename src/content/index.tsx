import { createRoot } from 'react-dom/client';
import { extractValue } from './engine';
import { UiImageCard } from '../components/dedicated/UiImageCard';
import { UiModernGridPage } from '../components/dedicated/UiModernGridPage';
import { UiTagBadge } from '../components/dedicated/UiTagBadge';
import { UiSearchBar } from '../components/dedicated/UiSearchBar';
import { UiPaginationBar } from '../components/dedicated/UiPaginationBar';
import { UiBox, UiFlexRow, UiFlexColumn, UiGrid, UiText, UiImage, UiLink } from '../components/primitives/LayoutPrimitives';
import stylesText from './content.css?inline';

const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  UiImageCard,
  UiModernGridPage,
  UiTagBadge,
  UiSearchBar,
  UiPaginationBar,
  UiBox,
  UiFlexRow,
  UiFlexColumn,
  UiGrid,
  UiText,
  UiImage,
  UiLink
};

interface ComponentConfig {
  name: string;
  selector: string;
  action: 'replace' | 'append';
  propsMap: Record<string, string>;
  props?: Record<string, any>;
}

interface ReconstructConfig {
  containerSelector: string;
  layoutComponent: string;
  propsMap: Record<string, string>;
  mediaQuery?: string;
  preserve?: Record<string, string>;
  children: {
    name: string;
    selector: string;
    propsMap: Record<string, string>;
  }[];
}

interface SiteManifest {
  theme?: {
    cssVariables?: Record<string, string>;
  };
  components?: ComponentConfig[];
  reconstructs?: ReconstructConfig[];
}

function applyTheme(shadowRoot: ShadowRoot, variables: Record<string, string>) {
  const styleEl = document.createElement('style');
  const cssVars = Object.entries(variables)
    .map(([key, val]) => `${key}: ${val};`)
    .join('\n');
  styleEl.textContent = `:host { ${cssVars} }`;
  shadowRoot.appendChild(styleEl);
}

function renderEngine(manifest: SiteManifest) {
  // 1. Process Reconstruction array
  if (manifest.reconstructs && manifest.reconstructs.length > 0) {
    for (const reconConfig of manifest.reconstructs) {
      const { containerSelector, layoutComponent, propsMap, mediaQuery, preserve, children } = reconConfig;

      // Media query responsiveness check
      if (mediaQuery && !window.matchMedia(mediaQuery).matches) {
        continue;
      }

      const container = document.querySelector(containerSelector);

      if (container) {
        // Extract properties
        const pageProps: Record<string, any> = {};
        for (const [propName, rule] of Object.entries(propsMap)) {
          pageProps[propName] = extractValue(container, rule);
        }

        // Extract children lists
        const childrenLists: Record<string, any[]> = {};
        for (const childRule of children) {
          const itemElements = container.querySelectorAll(childRule.selector);
          const list: any[] = [];

          itemElements.forEach((itemEl) => {
            const itemProps: Record<string, any> = {};
            for (const [propName, rule] of Object.entries(childRule.propsMap)) {
              itemProps[propName] = extractValue(itemEl, rule);
            }
            list.push(itemProps);
          });

          childrenLists[childRule.name] = list;
        }

        // Cache preserved original DOM element references
        const preservedNodes: Record<string, Element> = {};
        if (preserve) {
          for (const [slotName, selector] of Object.entries(preserve)) {
            const targetNode = container.querySelector(selector);
            if (targetNode) {
              preservedNodes[slotName] = targetNode;
            }
          }
        }

        // Hide legacy layout container
        (container as HTMLElement).style.display = 'none';

        // Setup Modern Shadow DOM Root Host
        const host = document.createElement('div');
        host.className = `modern-reconstruct-host-${layoutComponent.toLowerCase()}`;
        
        // Reset host styles in the host DOM
        host.style.display = 'block';
        host.style.width = '100%';
        host.style.margin = '0';
        host.style.padding = '0';
        host.style.border = 'none';

        container.parentNode?.insertBefore(host, container.nextSibling);

        // Reset parent element padding and borders to integrate perfectly
        if (host.parentElement) {
          host.parentElement.style.padding = '0';
          host.parentElement.style.margin = '0';
          host.parentElement.style.border = 'none';
        }

        const shadowRoot = host.attachShadow({ mode: 'open' });

        const styleTag = document.createElement('style');
        styleTag.textContent = stylesText;
        shadowRoot.appendChild(styleTag);

        if (manifest.theme?.cssVariables) {
          applyTheme(shadowRoot, manifest.theme.cssVariables);
        }

        const rootContainer = document.createElement('div');
        rootContainer.id = 'modern-root';
        shadowRoot.appendChild(rootContainer);

        const Component = COMPONENT_REGISTRY[layoutComponent];
        if (Component) {
          const root = createRoot(rootContainer);
          root.render(<Component {...pageProps} {...childrenLists} />);

          // Execute DOM reparenting in microtask loop once React finishes mounting layout
          setTimeout(() => {
            for (const [slotName, node] of Object.entries(preservedNodes)) {
              const slotContainer = shadowRoot.querySelector(`#${slotName}-container`);
              if (slotContainer) {
                // Clear any previous placeholder texts/items and insert the preserved legacy element
                slotContainer.innerHTML = '';
                slotContainer.appendChild(node);
              }
            }
          }, 0);
        }
      }
    }
  }

  // 2. Process Traditional replacements
  if (manifest.components) {
    for (const compConfig of manifest.components) {
      const originalElements = document.querySelectorAll(compConfig.selector);
      const Component = COMPONENT_REGISTRY[compConfig.name];

      if (!Component) continue;

      originalElements.forEach((originalEl) => {
        const extractedProps: Record<string, any> = {};
        for (const [propName, rule] of Object.entries(compConfig.propsMap)) {
          extractedProps[propName] = extractValue(originalEl, rule);
        }
        // Merge static props from config (not DOM-extracted)
        const allProps = { ...extractedProps, ...(compConfig.props || {}) };

        // Capture original dimensions before replacement
        const originalRect = (originalEl as HTMLElement).getBoundingClientRect();
        const originalDisplay = window.getComputedStyle(originalEl as HTMLElement).display;

        const host = document.createElement('div');
        host.className = `modern-host-${compConfig.name.toLowerCase()}`;
        // Match display and min-width of replaced element so host doesn't collapse
        host.style.display = originalDisplay === 'none' || originalDisplay === 'inline' ? 'block' : originalDisplay;
        host.style.width = '100%';
        if (originalRect.width > 0) {
          host.style.minWidth = `${originalRect.width}px`;
        }
        host.style.margin = '0';
        host.style.padding = '0';
        host.style.border = 'none';
        host.style.background = 'transparent';

        const shadowRoot = host.attachShadow({ mode: 'open' });

        const styleTag = document.createElement('style');
        styleTag.textContent = stylesText;
        shadowRoot.appendChild(styleTag);

        if (manifest.theme?.cssVariables) {
          applyTheme(shadowRoot, manifest.theme.cssVariables);
        }

        const rootContainer = document.createElement('div');
        rootContainer.id = 'modern-root';
        rootContainer.style.width = '100%';
        shadowRoot.appendChild(rootContainer);

        const root = createRoot(rootContainer);
        root.render(<Component {...allProps} />);

        if (compConfig.action === 'replace') {
          originalEl.replaceWith(host);
        } else {
          originalEl.appendChild(host);
        }
      });
    }
  }
}

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
        renderEngine(manifest);
      }
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.spm_global_enabled || changes.spm_active_themes || changes.spm_theme_overrides) {
        window.location.reload();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEngine);
} else {
  initEngine();
}
