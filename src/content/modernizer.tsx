import { createRoot } from 'react-dom/client';
import { extractValue } from './engine';
import { COMPONENT_REGISTRY } from '../components/registry';
import { UiToastContainer } from '../components/dedicated/UiToast';

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

export interface ReconstructConfig {
  containerSelector: string;
  layoutComponent: string;
  propsMap?: Record<string, string>;
  props?: Record<string, any>;
  mediaQuery?: string;
  urlPattern?: string;
  preserve?: Record<string, string>;
  children: ChildrenConfig[];
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
        itemProps[propName] = extractValue(itemEl as HTMLElement, propRule);
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

export function runModernizer(rootContext: Document | HTMLElement, manifest: SiteManifest, stylesText: string, styleCSS: string = '') {
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
    styleTag.textContent = stylesText + '\n' + styleCSS;
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
      window.dispatchEvent(new CustomEvent('spm-show-toast', {
        detail: { message: text, type: 'info' }
      }));
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

      if (container) {
        // Extract properties
        const pageProps: Record<string, any> = {};
        for (const [propName, rule] of Object.entries(propsMap || {})) {
          pageProps[propName] = extractValue(container as HTMLElement, rule);
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
        styleTag.textContent = stylesText + '\n' + styleCSS;
        shadowRoot.appendChild(styleTag);

        if (manifest.theme?.cssVariables) {
          applyTheme(shadowRoot, manifest.theme.cssVariables);
        }

        const rootContainer = rootDoc.createElement('div');
        rootContainer.id = 'modern-root';
        shadowRoot.appendChild(rootContainer);

        const Component = COMPONENT_REGISTRY[layoutComponent];
        if (Component) {
          console.log('[SPM Engine] Reconstructing:', layoutComponent, { staticProps, pageProps, childrenLists });
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
        styleTag.textContent = stylesText + '\n' + styleCSS;
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

export function normalizeGitOpsUrl(baseUrl: string, filePath: string, ref: string = 'master'): string {
  let base = baseUrl.trim().replace(/\/$/, '');
  
  const githubRegex = /^https?:\/\/(www\.)?github\.com\/([^\/]+)\/([^\/]+)/i;
  const githubMatch = base.match(githubRegex);
  if (githubMatch) {
    const user = githubMatch[2];
    const repo = githubMatch[3].replace(/\.git$/, '');
    return `https://raw.githubusercontent.com/${user}/${repo}/${ref}/${filePath}`;
  }

  const gitlabRegex = /^https?:\/\/(www\.)?gitlab\.com\/([^\/]+)\/([^\/]+)/i;
  const gitlabMatch = base.match(gitlabRegex);
  if (gitlabMatch) {
    const user = gitlabMatch[2];
    const repo = gitlabMatch[3].replace(/\.git$/, '');
    return `https://gitlab.com/${user}/${repo}/-/raw/${ref}/${filePath}`;
  }

  const rawGithubRegex = /^https?:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)/i;
  const rawGithubMatch = base.match(rawGithubRegex);
  if (rawGithubMatch) {
    const user = rawGithubMatch[1];
    const repo = rawGithubMatch[2].replace(/\.git$/, '');
    return `https://raw.githubusercontent.com/${user}/${repo}/${ref}/${filePath}`;
  }

  return `${base}/${filePath}`;
}

export async function fetchRegistry(gitopsUrl: string) {
  const url = normalizeGitOpsUrl(gitopsUrl, 'registry.json', 'master');
  console.log(`[SPM] Fetching registry from remote GitOps URL: ${url}`);
  const res = await fetch(`${url}?t=${Date.now()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch remote registry: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchThemeFiles(gitopsUrl: string, domain: string, pkgDir: string, ref: string) {
  const manifestPath = `websites/${domain}/${pkgDir}/manifest.json`;
  const cssPath = `websites/${domain}/${pkgDir}/style.css`;
  
  const manifestUrl = normalizeGitOpsUrl(gitopsUrl, manifestPath, ref);
  const cssUrl = normalizeGitOpsUrl(gitopsUrl, cssPath, ref);

  const t = Date.now();
  console.log(`[SPM] Fetching theme manifest from remote: ${manifestUrl}`);
  const manifestRes = await fetch(`${manifestUrl}?t=${t}`);
  if (!manifestRes.ok) {
    throw new Error(`Failed to fetch remote manifest from ${manifestUrl}: ${manifestRes.statusText}`);
  }
  const manifest = await manifestRes.json();

  console.log(`[SPM] Fetching theme CSS from remote: ${cssUrl}`);
  const cssRes = await fetch(`${cssUrl}?t=${t}`);
  if (!cssRes.ok) {
    throw new Error(`Failed to fetch remote CSS from ${cssUrl}: ${cssRes.statusText}`);
  }
  const cssText = await cssRes.text();

  return { manifest, cssText };
}
