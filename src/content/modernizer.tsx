import { createRoot } from 'react-dom/client';
import { extractValue } from './engine';
import { COMPONENT_REGISTRY } from '../components/registry';

export interface ChildrenConfig {
  name: string;
  selector: string;
  scope?: 'element' | 'document';
  propsMap: Record<string, string>;
}

export interface ComponentConfig {
  name: string;
  selector: string;
  action: 'replace' | 'append' | 'hide';
  propsMap: Record<string, string>;
  props?: Record<string, any>;
  children?: ChildrenConfig[];
}

export interface ReconstructConfig {
  containerSelector: string;
  layoutComponent: string;
  propsMap: Record<string, string>;
  props?: Record<string, any>;
  mediaQuery?: string;
  preserve?: Record<string, string>;
  children: ChildrenConfig[];
}

export interface SiteManifest {
  theme?: {
    cssVariables?: Record<string, string>;
    customStyles?: string;
  };
  components?: ComponentConfig[];
  reconstructs?: ReconstructConfig[];
}

export function applyTheme(shadowRoot: ShadowRoot, variables: Record<string, string>) {
  const styleEl = document.createElement('style');
  const cssVars = Object.entries(variables)
    .map(([key, val]) => `${key}: ${val};`)
    .join('\n');
  styleEl.textContent = `:host { ${cssVars} }`;
  shadowRoot.appendChild(styleEl);
}

export function applyThemeGlobally(variables: Record<string, string>, customStyles: string = '') {
  const styleId = 'spm-global-theme-styles';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const cssVars = Object.entries(variables)
    .map(([key, val]) => `${key}: ${val};`)
    .join('\n');

  styleEl.textContent = `
    :root, html, body, #body, .content, #content, div.content {
      ${cssVars}
      background-color: var(--spm-bg-primary) !important;
      background: var(--spm-bg-primary) !important;
      color: var(--spm-text-primary) !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }
    
    html, body {
      overflow-x: hidden !important;
    }

    a {
      color: var(--spm-text-muted);
      text-decoration: none;
    }
    a:hover {
      color: var(--spm-accent);
    }
    input, textarea, select {
      background-color: var(--spm-bg-secondary) !important;
      color: var(--spm-text-primary) !important;
      border: 1px solid var(--spm-border) !important;
    }

    /* Inject developer custom CSS overrides from the JSON theme manifest */
    ${customStyles}
  `;
}

export function runModernizer(rootContext: Document | HTMLElement, manifest: SiteManifest, stylesText: string) {
  // Helper queries targeting scoped parent
  const rootDoc = rootContext instanceof Document ? rootContext : document;

  // 1. Process Reconstruction array
  if (manifest.reconstructs && manifest.reconstructs.length > 0) {
    for (const reconConfig of manifest.reconstructs) {
      const { containerSelector, layoutComponent, propsMap, props: staticProps, mediaQuery, preserve, children } = reconConfig;

      // Media query responsiveness check
      if (mediaQuery && !window.matchMedia(mediaQuery).matches) {
        continue;
      }

      const container = rootContext.querySelector(containerSelector);

      if (container) {
        // Extract properties
        const pageProps: Record<string, any> = {};
        for (const [propName, rule] of Object.entries(propsMap)) {
          pageProps[propName] = extractValue(container as HTMLElement, rule);
        }

        // Extract children lists (supports scope:'document' for external elements)
        const childrenLists: Record<string, any[]> = {};
        for (const childRule of children) {
          const scope = childRule.scope === 'document' ? rootContext : container;
          const itemElements = scope.querySelectorAll(childRule.selector);
          const list: any[] = [];

          itemElements.forEach((itemEl) => {
            const itemProps: Record<string, any> = {};
            for (const [propName, rule] of Object.entries(childRule.propsMap)) {
              itemProps[propName] = extractValue(itemEl as HTMLElement, rule);
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
        const host = rootDoc.createElement('div');
        host.className = `modern-reconstruct-host-${layoutComponent.toLowerCase()}`;
        
        host.style.display = 'block';
        host.style.width = '100%';
        host.style.margin = '0';
        host.style.padding = '0';
        host.style.border = 'none';

        container.parentNode?.insertBefore(host, container.nextSibling);

        if (host.parentElement) {
          host.parentElement.style.padding = '0';
          host.parentElement.style.margin = '0';
          host.parentElement.style.border = 'none';
        }

        const shadowRoot = host.attachShadow({ mode: 'open' });

        const styleTag = rootDoc.createElement('style');
        styleTag.textContent = stylesText;
        shadowRoot.appendChild(styleTag);

        if (manifest.theme?.cssVariables) {
          applyTheme(shadowRoot, manifest.theme.cssVariables);
        }

        const rootContainer = rootDoc.createElement('div');
        rootContainer.id = 'modern-root';
        shadowRoot.appendChild(rootContainer);

        const Component = COMPONENT_REGISTRY[layoutComponent];
        if (Component) {
          const root = createRoot(rootContainer);
          root.render(<Component {...(staticProps || {})} {...pageProps} {...childrenLists} />);

          // Execute DOM reparenting in microtask loop once React finishes mounting layout
          setTimeout(() => {
            for (const [slotName, node] of Object.entries(preservedNodes)) {
              const slotContainer = shadowRoot.querySelector(`#${slotName}-container`);
              if (slotContainer) {
                slotContainer.innerHTML = '';
                slotContainer.appendChild(node);
              }
            }
          }, 0);
        }
      }
    }
  }

  // 2. Process component replacements
  if (manifest.components) {
    for (const compConfig of manifest.components) {
      const originalElements = rootContext.querySelectorAll(compConfig.selector);

      // action:hide — simply hide the element, no React mount
      if (compConfig.action === 'hide') {
        originalElements.forEach(el => { (el as HTMLElement).style.display = 'none'; });
        continue;
      }

      const Component = COMPONENT_REGISTRY[compConfig.name];
      if (!Component) continue;

      originalElements.forEach((originalEl) => {
        const extractedProps: Record<string, any> = {};
        for (const [propName, rule] of Object.entries(compConfig.propsMap)) {
          extractedProps[propName] = extractValue(originalEl as HTMLElement, rule);
        }

        // Extract children arrays (supports scope:'document' for sibling elements)
        const childrenLists: Record<string, any[]> = {};
        for (const childRule of (compConfig.children || [])) {
          const scope = childRule.scope === 'document' ? rootContext : originalEl;
          const childEls = scope.querySelectorAll(childRule.selector);
          const list: any[] = [];
          childEls.forEach(childEl => {
            const itemProps: Record<string, any> = {};
            for (const [propName, rule] of Object.entries(childRule.propsMap)) {
              itemProps[propName] = extractValue(childEl as HTMLElement, rule);
            }
            list.push(itemProps);
          });
          childrenLists[childRule.name] = list;
        }

        const allProps = { ...extractedProps, ...childrenLists, ...(compConfig.props || {}) };

        const originalDisplay = window.getComputedStyle(originalEl as HTMLElement).display;

        const host = rootDoc.createElement('div');
        host.className = `modern-host-${compConfig.name.toLowerCase()}`;
        host.style.display = originalDisplay === 'none' || originalDisplay === 'inline' ? 'block' : originalDisplay;
        host.style.width = '100%';
        host.style.margin = '0';
        host.style.padding = '0';
        host.style.border = 'none';
        host.style.background = 'transparent';

        const shadowRoot = host.attachShadow({ mode: 'open' });

        const styleTag = rootDoc.createElement('style');
        styleTag.textContent = stylesText;
        shadowRoot.appendChild(styleTag);

        if (manifest.theme?.cssVariables) applyTheme(shadowRoot, manifest.theme.cssVariables);

        const rootContainer = rootDoc.createElement('div');
        rootContainer.id = 'modern-root';
        rootContainer.style.width = '100%';
        shadowRoot.appendChild(rootContainer);

        createRoot(rootContainer).render(<Component {...allProps} />);

        if (compConfig.action === 'replace') {
          originalEl.replaceWith(host);
        } else {
          originalEl.appendChild(host);
        }
      });
    }
  }
}
