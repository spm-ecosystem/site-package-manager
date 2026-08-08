import { createRoot } from 'react-dom/client';
import { COMPONENT_REGISTRY } from '../components/registry';
import { extractValue } from '../content/engine';

function createEditorWrapper(
  componentName: string,
  selector: string,
  type: 'component' | 'reconstruct',
  manifest: any,
  container: HTMLElement
): { wrapper: HTMLElement; host: HTMLElement } {
  // 1. Create Wrapper element
  const wrapper = document.createElement('div');
  wrapper.className = 'spm-modern-wrapper';
  wrapper.style.position = 'relative';
  wrapper.style.border = '1px dashed rgba(255, 255, 255, 0.08)';
  wrapper.style.borderRadius = '6px';
  wrapper.style.padding = '4px';
  wrapper.style.margin = '12px 0';
  wrapper.style.transition = 'border-color 0.2s ease, box-shadow 0.2s ease';

  // 2. Action Toolbar Header (Shown on hover)
  const header = document.createElement('div');
  header.className = 'spm-wrapper-header';
  header.style.position = 'absolute';
  header.style.top = '-20px';
  header.style.right = '4px';
  header.style.display = 'none'; // Controlled by CSS rule
  header.style.gap = '4px';
  header.style.zIndex = '999';
  header.style.fontFamily = 'system-ui, sans-serif';

  // 3. Name Label tag
  const label = document.createElement('span');
  label.textContent = componentName;
  label.style.fontSize = '9px';
  label.style.fontWeight = 'bold';
  label.style.background = '#111111';
  label.style.color = 'white';
  label.style.padding = '2px 6px';
  label.style.borderRadius = '3px 3px 0 0';
  label.style.cursor = 'default';
  label.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

  // 4. Delete Action Button
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Del';
  deleteBtn.style.background = '#111111';
  deleteBtn.style.border = '1px solid rgba(255,255,255,0.1)';
  deleteBtn.style.color = 'white';
  deleteBtn.style.fontSize = '10px';
  deleteBtn.style.cursor = 'pointer';
  deleteBtn.style.padding = '2px 5px';
  deleteBtn.style.borderRadius = '3px 3px 0 0';
  deleteBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const hostEl = container.getRootNode() as any;
    const parentHost = hostEl?.host;
    if (parentHost && typeof parentHost.__deleteComponent === 'function') {
      parentHost.__deleteComponent(selector, type);
    }
  };

  // 4b. Edit/Configure Action Button
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.style.background = '#111111';
  editBtn.style.border = '1px solid rgba(255,255,255,0.1)';
  editBtn.style.color = 'white';
  editBtn.style.fontSize = '10px';
  editBtn.style.cursor = 'pointer';
  editBtn.style.padding = '2px 5px';
  editBtn.style.borderRadius = '3px 3px 0 0';
  editBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
  editBtn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const hostEl = container.getRootNode() as any;
    const parentHost = hostEl?.host;
    if (parentHost && typeof parentHost.__selectComponent === 'function') {
      parentHost.__selectComponent(selector, type);
    }
  };

  header.appendChild(label);
  header.appendChild(editBtn);
  header.appendChild(deleteBtn);
  wrapper.appendChild(header);

  // 5. Component Mounting Host Node
  const host = document.createElement('div');
  host.className = `spm-resizable-host modern-host-${componentName.toLowerCase()}`;
  host.style.width = '100%';
  host.style.minWidth = '150px';
  host.style.boxSizing = 'border-box';
  host.style.display = 'block';

  // Apply saved width from layout manifest if existing
  const configList = type === 'reconstruct' ? (manifest.reconstructs || []) : (manifest.components || []);
  const matchingConfig = configList.find((c: any) => c.selector === selector || c.containerSelector === selector);
  if (matchingConfig?.style?.width) {
    host.style.width = matchingConfig.style.width;
  }

  // Active native resize horizontal slider
  host.style.resize = 'horizontal';
  host.style.overflow = 'hidden';

  // Observe width changes and update layout JSON
  let resizeTimeout: any;
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.contentRect.width;
      if (width === 0) continue;
      
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const hostEl = container.getRootNode() as any;
        const parentHost = hostEl?.host;
        if (parentHost && typeof parentHost.__updateComponentWidth === 'function') {
          parentHost.__updateComponentWidth(selector, type, `${Math.round(width)}px`);
        }
      }, 500);
    }
  });
  observer.observe(host);

  wrapper.appendChild(host);

  // Intercept and block all clicks inside the component wrapper during capture phase
  // to prevent standard web buttons/links from causing redirects in the IDE.
  wrapper.addEventListener('click', (e) => {
    const isToolbarClick = (e.target as HTMLElement).closest('.spm-wrapper-header');
    if (!isToolbarClick) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true); // Capture phase (true) is crucial here!

  return { wrapper, host };
}

export function runSandboxEngine(container: HTMLElement, manifest: any): number {
  if (!manifest) return 0;

  let matchedCount = 0;

  // Inject visual editor rules inside container style
  const editorStyles = document.createElement('style');
  editorStyles.textContent = `
    .spm-modern-wrapper:hover {
      border-color: #16a34a !important;
      box-shadow: 0 0 12px rgba(22, 163, 74, 0.2);
    }
    .spm-modern-wrapper:hover .spm-wrapper-header {
      display: flex !important;
    }
    .spm-resizable-host::-webkit-resizer {
      border: 3px solid transparent;
      border-bottom-color: #16a34a;
      border-right-color: #16a34a;
      cursor: ew-resize;
    }
  `;
  container.appendChild(editorStyles);

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

      // Setup React Mount host in editor wrapper
      const { wrapper, host } = createEditorWrapper(
        config.layoutComponent,
        config.containerSelector,
        'reconstruct',
        manifest,
        container
      );
      originalEl.parentNode?.insertBefore(wrapper, originalEl.nextSibling);

      // Inject theme variables directly
      if (manifest.theme?.cssVariables) {
        Object.entries(manifest.theme.cssVariables).forEach(([k, v]) => {
          host.style.setProperty(k, v as string);
        });
      }

      const Component = COMPONENT_REGISTRY[config.layoutComponent];
      if (Component) {
        const root = createRoot(host);
        root.render(<Component {...(config.props || {})} {...pageProps} {...childrenLists} />);

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

        // Setup React Mount host in editor wrapper
        const { wrapper, host } = createEditorWrapper(
          compConfig.name,
          compConfig.selector,
          'component',
          manifest,
          container
        );
        originalEl.parentNode?.insertBefore(wrapper, originalEl.nextSibling);

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
