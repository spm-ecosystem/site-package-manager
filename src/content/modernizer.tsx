import { createRoot } from 'react-dom/client';
import { extractValue, revealPage } from './engine';
import { COMPONENT_REGISTRY } from '../components-registry';
import { UiToastContainer } from '../components/dedicated/UiToast';

const WORKER_ORIGIN = 'https://spm.hexacloud.net.br';


export interface ChildrenConfig {
  name: string;
  selector: string;
  scope?: 'element' | 'document';
  propsMap: Record<string, string>;
  children?: ChildrenConfig[];
}

export interface ComponentConfig {
  name: string;
  selector: string;
  action: 'replace' | 'append' | 'hide';
  propsMap: Record<string, string>;
  props?: Record<string, any>;
  children?: ChildrenConfig[];
}

export interface InfiniteScrollConfig {
  nextPageSelector: string;
  nextPageText?: string;
}

export interface ReconstructConfig {
  containerSelector: string;
  layoutComponent: string;
  propsMap?: Record<string, string>;
  props?: Record<string, any>;
  mediaQuery?: string;
  urlPattern?: string;
  preserve?: Record<string, string>;
  children: ChildrenConfig[];
  infiniteScroll?: InfiniteScrollConfig;
}

export interface SiteManifest {
  theme?: {
    cssVariables?: Record<string, string>;
    customStyles?: string;
    noticeSelector?: string;
  };
  components?: ComponentConfig[];
  reconstructs?: ReconstructConfig[];
}

export function applyTheme(shadowRoot: ShadowRoot, variables: Record<string, string>) {
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-spm-vars', 'true');
  const cssVars = Object.entries(variables)
    .map(([key, val]) => `${key}: ${val};`)
    .join('\n');
  styleEl.textContent = `:host { ${cssVars} }`;
  shadowRoot.appendChild(styleEl);
}

export function applyThemeGlobally(variables: Record<string, string>, customStyles: string = '', noticeSelector: string = '#notice') {
  const styleId = 'spm-global-theme-styles';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    const parent = document.head || document.documentElement;
    parent.appendChild(styleEl);
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

    body.spm-reconstructed {
      overflow: hidden !important;
      height: 100vh !important;
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

    #notice, .notice, ${noticeSelector} {
      display: none !important;
    }

    /* Inject developer custom CSS overrides from the JSON theme manifest */
    ${customStyles}
  `;
}

export function parsePropValue(val: string | null): any {
  if (val === null) return null;
  const trimmed = val.trim();
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      // ignore parsing errors and return raw string
    }
  }
  return val;
}

function extractChildren(
  rootContext: Document | HTMLElement,
  container: Element,
  rules: ChildrenConfig[]
): Record<string, any[]> {
  const result: Record<string, any[]> = {};
  for (const rule of rules) {
    const scope = rule.scope === 'document' ? rootContext : container;
    const itemElements = scope.querySelectorAll(rule.selector);
    const list: any[] = [];

    itemElements.forEach((itemEl) => {
      const itemProps: Record<string, any> = {};
      for (const [propName, propRule] of Object.entries(rule.propsMap || {})) {
        itemProps[propName] = parsePropValue(extractValue(itemEl as HTMLElement, propRule));
      }
      if (rule.children && rule.children.length > 0) {
        const subChildren = extractChildren(rootContext, itemEl, rule.children);
        Object.assign(itemProps, subChildren);
      }
      list.push(itemProps);
    });

    result[rule.name] = list;
  }
  return result;
}

function getNextPageUrl(context: Document | HTMLElement, config?: InfiniteScrollConfig): string | null {
  if (!config || !config.nextPageSelector) return null;
  const elements = context.querySelectorAll(config.nextPageSelector);
  for (const el of Array.from(elements)) {
    const text = el.textContent?.trim();
    const href = el.getAttribute('href');
    const alt = el.getAttribute('alt')?.toLowerCase();
    const title = el.getAttribute('title')?.toLowerCase();
    const rel = el.getAttribute('rel')?.toLowerCase();
    
    if (!href) continue;

    // Direct attribute indicators for "next page"
    if (alt === 'next' || title === 'next' || rel === 'next' || alt === 'next page') {
      return href;
    }

    if (config.nextPageText) {
      if (text === config.nextPageText) {
        return href;
      }
    } else {
      // Default: take the first matched link
      return href;
    }
  }
  return null;
}

export function runModernizer(rootContext: Document | HTMLElement, manifest: SiteManifest, stylesText: string, _styleCSS: string = '') {
  // Helper queries targeting scoped parent
  const rootDoc = rootContext instanceof Document ? rootContext : document;



  // Mount global Toast root for notifications
  const toastHostId = 'spm-global-toast-host';
  if (!rootDoc.getElementById(toastHostId) && rootDoc.body) {
    const toastHost = rootDoc.createElement('div');
    toastHost.id = toastHostId;
    toastHost.style.position = 'fixed';
    toastHost.style.top = '0';
    toastHost.style.right = '0';
    toastHost.style.zIndex = '999999';
    toastHost.style.pointerEvents = 'none';

    rootDoc.body.appendChild(toastHost);

    const shadowRoot = toastHost.attachShadow({ mode: 'open' });
    const styleTag = rootDoc.createElement('style');
    styleTag.textContent = stylesText;
    shadowRoot.appendChild(styleTag);

    if (manifest.theme?.cssVariables) {
      applyTheme(shadowRoot, manifest.theme.cssVariables);
    }

    const toastRoot = rootDoc.createElement('div');
    shadowRoot.appendChild(toastRoot);
    createRoot(toastRoot).render(<UiToastContainer />);
  }

  const noticeSelector = manifest.theme?.noticeSelector || '#notice';
  const noticeEl = rootContext.querySelector(noticeSelector);
  if (noticeEl) {
    let lastText = '';

    const showToast = (text: string) => {
      if (!text || text === lastText) return;
      lastText = text;
      const detail = { message: text, type: 'info' };
      window.dispatchEvent(new CustomEvent('spm-show-toast', { detail }));
      if (window.top && window.top !== window) {
        try {
          window.top.dispatchEvent(new CustomEvent('spm-show-toast', { detail }));
        } catch (e) {
          window.top.postMessage({ type: 'spm-show-toast', message: text, toastType: 'info' }, '*');
        }
      }
    };

    // Show initial text if present and not explicitly hidden
    const initialText = noticeEl.textContent?.trim();
    const isInitiallyVisible = (noticeEl as HTMLElement).style.display !== 'none';
    if (initialText && isInitiallyVisible) {
      showToast(initialText);
    }

    const observer = new MutationObserver(() => {
      const text = noticeEl.textContent?.trim();
      const isVisible = (noticeEl as HTMLElement).style.display !== 'none';
      if (text && isVisible) {
        showToast(text);
      } else if (!text) {
        lastText = '';
      }
    });

    observer.observe(noticeEl, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  // 1. Process Reconstruction array
  if (manifest.reconstructs && manifest.reconstructs.length > 0) {
    for (const reconConfig of manifest.reconstructs) {
      const { containerSelector, layoutComponent, propsMap, props: staticProps, mediaQuery, urlPattern, preserve, children } = reconConfig;

      // URL pattern check to differentiate page routes
      if (urlPattern && !new RegExp(urlPattern, 'i').test(window.location.href)) {
        continue;
      }

      // Media query responsiveness check
      if (mediaQuery && !window.matchMedia(mediaQuery).matches) {
        continue;
      }

      const container = rootContext.querySelector(containerSelector);

      if (container && !container.hasAttribute('data-spm-modernized')) {
        container.setAttribute('data-spm-modernized', 'true');
        // Extract properties
        const pageProps: Record<string, any> = {};
        for (const [propName, rule] of Object.entries(propsMap || {})) {
          pageProps[propName] = parsePropValue(extractValue(container as HTMLElement, rule));
        }

        // Extract children lists (supports scope:'document' for external elements)
        const childrenLists = extractChildren(rootContext, container, children);

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

        // Add scroll containment marker to body
        rootDoc.body.classList.add('spm-reconstructed');

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
          // Setup onLoadMore callback if infiniteScroll config exists
          let onLoadMore: any = undefined;
          if (reconConfig.infiniteScroll) {
            let currentNextPageUrl = getNextPageUrl(rootDoc, reconConfig.infiniteScroll);
            
            onLoadMore = async () => {
              if (!currentNextPageUrl) {
                return { items: [], tableRows: [], hasMore: false };
              }
              try {
                const absoluteUrl = new URL(currentNextPageUrl, window.location.href).href;
                console.log('[SPM Engine] Fetching next page:', absoluteUrl);
                const res = await fetch(absoluteUrl);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const html = await res.text();
                
                const parser = new DOMParser();
                const nextDoc = parser.parseFromString(html, 'text/html');
                
                const nextChildren = extractChildren(nextDoc, nextDoc.body, children);
                
                currentNextPageUrl = getNextPageUrl(nextDoc, reconConfig.infiniteScroll);
                console.log('[SPM Engine] Infinite Scroll next URL updated to:', currentNextPageUrl);
                
                return {
                  ...nextChildren,
                  hasMore: !!currentNextPageUrl
                };
              } catch (err) {
                console.error('[SPM Engine] Infinite Scroll load failed:', err);
                return { items: [], tableRows: [], hasMore: false };
              }
            };
          }

          console.log('[SPM Engine] Reconstructing:', layoutComponent, { staticProps, pageProps, childrenLists, hasInfiniteScroll: !!onLoadMore });
          const root = createRoot(rootContainer);
          root.render(<Component {...(staticProps || {})} {...pageProps} {...childrenLists} onLoadMore={onLoadMore} />);

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

      // action:hide - simply hide the element, no React mount
      if (compConfig.action === 'hide') {
        originalElements.forEach(el => { (el as HTMLElement).style.display = 'none'; });
        continue;
      }

      const Component = COMPONENT_REGISTRY[compConfig.name];
      if (!Component) continue;

      originalElements.forEach((originalEl) => {
        if (originalEl.hasAttribute('data-spm-modernized')) return;
        originalEl.setAttribute('data-spm-modernized', 'true');
        const extractedProps: Record<string, any> = {};
        for (const [propName, rule] of Object.entries(compConfig.propsMap)) {
          extractedProps[propName] = parsePropValue(extractValue(originalEl as HTMLElement, rule));
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
              itemProps[propName] = parsePropValue(extractValue(childEl as HTMLElement, rule));
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
          if (originalEl instanceof HTMLElement) {
            originalEl.style.setProperty('display', 'none', 'important');
          }
          originalEl.after(host);
        } else {
          originalEl.appendChild(host);
        }
      });
    }
  }

  // 3. Anti flickering reveal
  revealPage();
}

export async function fetchThemeFiles(domain: string, themeName: string, version: string) {
  const manifestUrl = `${WORKER_ORIGIN}/spm/v1/api/themes/${domain}/${themeName}/${version}/manifest.json`;
  const cssUrl = `${WORKER_ORIGIN}/spm/v1/api/themes/${domain}/${themeName}/${version}/content.css`;

  console.log(`[SPM] Fetching theme assets from Worker: manifest and css...`);

  const [manifestRes, cssRes] = await Promise.all([
    fetch(manifestUrl),
    fetch(cssUrl)
  ]);

  if (!manifestRes.ok) {
    throw new Error(`Failed to fetch theme manifest from ${manifestUrl}: ${manifestRes.statusText}`);
  }

  const manifest: SiteManifest = await manifestRes.json();
  let cssText = '';
  if (cssRes.ok) {
    cssText = await cssRes.text();
  }

  if (!manifest.theme) {
    manifest.theme = {};
  }
  manifest.theme.customStyles = cssText;

  return { manifest, cssText };
}
