import { createRoot } from 'react-dom/client';
import { COMPONENT_REGISTRY } from '../components/registry';
import { extractValue } from '../content/engine';

export function runSandboxEngine(container: HTMLElement, manifest: any): number {
  if (!manifest) return 0;

  let matchedCount = 0;

  // Apply custom CSS overrides to the container context
  if (manifest.theme?.customStyles) {
    const styleEl = document.createElement('style');
    styleEl.textContent = manifest.theme.customStyles;
    container.appendChild(styleEl);
  }

  // 1. Process Reconstructs (e.g. replacing layout grids or post panels)
  if (manifest.reconstructs) {
    for (const config of manifest.reconstructs) {
      const originalEl = container.querySelector(config.containerSelector);
      if (!originalEl) continue;

      matchedCount++;

      // Extract properties
      const pageProps: Record<string, any> = {};
      for (const [propName, rule] of Object.entries(config.propsMap || {})) {
        pageProps[propName] = extractValue(originalEl as HTMLElement, rule as string);
      }

      // Extract children arrays (like post lists or tag badges)
      const childrenLists: Record<string, any[]> = {};
      for (const childRule of (config.children || [])) {
        const scope = childRule.scope === 'document' ? container : originalEl;
        const childEls = scope.querySelectorAll(childRule.selector);
        const list: any[] = [];
        childEls.forEach((childEl: Element) => {
          const itemProps: Record<string, any> = {};
          for (const [propName, rule] of Object.entries(childRule.propsMap || {})) {
            itemProps[propName] = extractValue(childEl as HTMLElement, rule as string);
          }
          list.push(itemProps);
        });
        childrenLists[childRule.name] = list;
      }

      // Clone preserved nodes to insert in React slot slots safely
      const preservedNodes: Record<string, HTMLElement> = {};
      for (const [slotName, selector] of Object.entries(config.preserve || {})) {
        const node = container.querySelector(selector as string);
        if (node) {
          preservedNodes[slotName] = node.cloneNode(true) as HTMLElement;
        }
      }

      // Hide original element
      (originalEl as HTMLElement).style.display = 'none';

      // Setup React Mount host
      const host = document.createElement('div');
      host.className = `modern-reconstruct-host-${config.layoutComponent.toLowerCase()}`;
      host.style.width = '100%';
      originalEl.parentNode?.insertBefore(host, originalEl.nextSibling);

      // Inject theme variables directly
      if (manifest.theme?.cssVariables) {
        Object.entries(manifest.theme.cssVariables).forEach(([k, v]) => {
          host.style.setProperty(k, v as string);
        });
      }

      const Component = COMPONENT_REGISTRY[config.layoutComponent];
      if (Component) {
        const root = createRoot(host);
        root.render(<Component {...pageProps} {...childrenLists} />);

        // Reparent slots
        setTimeout(() => {
          for (const [slotName, node] of Object.entries(preservedNodes)) {
            const slotContainer = host.querySelector(`#${slotName}-container`) || host.shadowRoot?.querySelector(`#${slotName}-container`);
            if (slotContainer) {
              slotContainer.innerHTML = '';
              slotContainer.appendChild(node);
            }
          }
        }, 50);
      }
    }
  }

  // 2. Process Components (like headers, search bars, etc.)
  if (manifest.components) {
    for (const compConfig of manifest.components) {
      const originalElements = container.querySelectorAll(compConfig.selector);

      if (compConfig.action === 'hide') {
        originalElements.forEach(el => { 
          (el as HTMLElement).style.display = 'none'; 
          matchedCount++;
        });
        continue;
      }

      const Component = COMPONENT_REGISTRY[compConfig.name];
      if (!Component) continue;

      originalElements.forEach((originalEl) => {
        matchedCount++;
        const extractedProps: Record<string, any> = {};
        for (const [propName, rule] of Object.entries(compConfig.propsMap || {})) {
          extractedProps[propName] = extractValue(originalEl as HTMLElement, rule as string);
        }

        const childrenLists: Record<string, any[]> = {};
        for (const childRule of (compConfig.children || [])) {
          const scope = childRule.scope === 'document' ? container : originalEl;
          const childEls = scope.querySelectorAll(childRule.selector);
          const list: any[] = [];
          childEls.forEach((childEl: Element) => {
            const itemProps: Record<string, any> = {};
            for (const [propName, rule] of Object.entries(childRule.propsMap || {})) {
              itemProps[propName] = extractValue(childEl as HTMLElement, rule as string);
            }
            list.push(itemProps);
          });
          childrenLists[childRule.name] = list;
        }

        const allProps = { ...extractedProps, ...childrenLists, ...(compConfig.props || {}) };

        (originalEl as HTMLElement).style.display = 'none';

        const host = document.createElement('div');
        host.className = `modern-host-${compConfig.name.toLowerCase()}`;
        host.style.width = '100%';
        originalEl.parentNode?.insertBefore(host, originalEl.nextSibling);

        if (manifest.theme?.cssVariables) {
          Object.entries(manifest.theme.cssVariables).forEach(([k, v]) => {
            host.style.setProperty(k, v as string);
          });
        }

        const root = createRoot(host);
        root.render(<Component {...allProps} />);
      });
    }
  }

  return matchedCount;
}
