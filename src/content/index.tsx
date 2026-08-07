import { createRoot } from 'react-dom/client';
import { extractValue } from './engine';
import { UiImageCard } from '../components/UiImageCard';
import { UiModernGridPage } from '../components/UiModernGridPage';
import stylesText from './content.css?inline';

// Layout Primitives
function UiBox({ className, children, ...props }: any) {
  return <div className={className} {...props}>{children}</div>;
}

function UiFlexRow({ className, children, ...props }: any) {
  return <div className={`flex flex-row ${className || ''}`} {...props}>{children}</div>;
}

function UiFlexColumn({ className, children, ...props }: any) {
  return <div className={`flex flex-col ${className || ''}`} {...props}>{children}</div>;
}

function UiGrid({ className, children, ...props }: any) {
  return <div className={`grid ${className || ''}`} {...props}>{children}</div>;
}

function UiText({ className, content, ...props }: any) {
  return <span className={className} {...props}>{content}</span>;
}

function UiImage({ className, src, alt, ...props }: any) {
  return <img className={className} src={src} alt={alt} {...props} />;
}

function UiLink({ className, href, children, ...props }: any) {
  return <a className={className} href={href} {...props}>{children}</a>;
}

const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  UiImageCard,
  UiModernGridPage,
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

        const host = document.createElement('div');
        host.className = `modern-host-${compConfig.name.toLowerCase()}`;
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

        const root = createRoot(rootContainer);
        root.render(<Component {...extractedProps} />);

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
    chrome.storage.local.get(['spm_global_enabled', 'spm_installed_themes', 'spm_active_themes'], (res) => {
      const globalEnabled = res.spm_global_enabled !== false; // enabled by default
      if (!globalEnabled) return;

      const domain = window.location.hostname;
      const activeThemeId = res.spm_active_themes ? res.spm_active_themes[domain] : null;
      if (!activeThemeId) return;

      const manifest = res.spm_installed_themes ? res.spm_installed_themes[activeThemeId] : null;
      if (manifest) {
        renderEngine(manifest as SiteManifest);
      }
    });

    // Listen for real-time config updates (reload to redraw/clean layout)
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.spm_global_enabled || changes.spm_active_themes) {
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
