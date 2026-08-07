import { createRoot } from 'react-dom/client';
import { extractValue } from './engine';
import { UiImageCard } from '../components/UiImageCard';
import { UiModernGridPage } from '../components/UiModernGridPage';
import stylesText from './content.css?inline';
import safebooruConfig from '../../websites/safebooru.json';

const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  UiImageCard,
  UiModernGridPage,
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
  reconstruct?: ReconstructConfig;
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
  if (manifest.reconstruct) {
    const { containerSelector, layoutComponent, propsMap, children } = manifest.reconstruct;
    const container = document.querySelector(containerSelector);

    if (container) {
      const pageProps: Record<string, any> = {};
      for (const [propName, rule] of Object.entries(propsMap)) {
        pageProps[propName] = extractValue(container, rule);
      }

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

      (container as HTMLElement).style.display = 'none';

      const host = document.createElement('div');
      host.className = `modern-reconstruct-host-${layoutComponent.toLowerCase()}`;
      container.parentNode?.insertBefore(host, container.nextSibling);

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
      }
      return;
    }
  }

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => renderEngine(safebooruConfig as unknown as SiteManifest));
} else {
  renderEngine(safebooruConfig as unknown as SiteManifest);
}
