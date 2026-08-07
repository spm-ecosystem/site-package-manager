import React from 'react';
import { createRoot } from 'react-dom/client';
import { extractValue } from './engine';
import { UiImageCard } from '../components/UiImageCard';
import stylesText from './content.css?inline';
import safebooruConfig from './safebooru-mock.json';

const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  UiImageCard,
};

interface ComponentConfig {
  name: string;
  selector: string;
  action: 'replace' | 'append';
  propsMap: Record<string, string>;
}

interface SiteManifest {
  theme?: {
    cssVariables?: Record<string, string>;
  };
  components: ComponentConfig[];
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

// Start injection when DOMContentLoaded fires
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => renderEngine(safebooruConfig as SiteManifest));
} else {
  renderEngine(safebooruConfig as SiteManifest);
}
