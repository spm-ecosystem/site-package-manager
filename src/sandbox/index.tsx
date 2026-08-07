import { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '../content/content.css';
import { COMPONENT_REGISTRY } from '../components/registry';
import { extractValue } from '../content/engine';

interface CustomTheme {
  bgPrimary: string;
  bgSecondary: string;
  accent: string;
  textPrimary: string;
  customStyles: string;
}

interface InspectedElementData {
  tagName: string;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  text: string;
  suggestedSelectors: string[];
}

// Global helper to rewrites relative asset paths into absolute URLs
function makeUrlsAbsolute(html: string, baseUrlStr: string): string {
  try {
    const baseUrl = new URL(baseUrlStr);
    const baseOrigin = baseUrl.origin;
    const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);

    const resolve = (rel: string) => {
      if (!rel) return '';
      if (
        rel.startsWith('http://') || 
        rel.startsWith('https://') || 
        rel.startsWith('data:') || 
        rel.startsWith('javascript:') ||
        rel.startsWith('#') ||
        rel.startsWith('mailto:')
      ) {
        return rel;
      }
      if (rel.startsWith('//')) {
        return baseUrl.protocol + rel;
      }
      if (rel.startsWith('/')) {
        return baseOrigin + rel;
      }
      return baseOrigin + basePath + rel;
    };

    return html.replace(/\b(href|src)=["']([^"']+)["']/gi, (match, attr, val) => {
      try {
        return `${attr}="${resolve(val)}"`;
      } catch (e) {
        return match;
      }
    });
  } catch (err) {
    console.error('[SPM Sandbox] Error converting relative urls:', err);
    return html;
  }
}

// Dynamic local modernizer engine runner for the Sandbox Modern Preview
function runSandboxEngine(container: HTMLElement, manifest: any) {
  if (!manifest) return;

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
        originalElements.forEach(el => { (el as HTMLElement).style.display = 'none'; });
        continue;
      }

      const Component = COMPONENT_REGISTRY[compConfig.name];
      if (!Component) continue;

      originalElements.forEach((originalEl) => {
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
}

function SandboxApp() {
  const [targetUrl, setTargetUrl] = useState<string>('https://example.com');
  const [urlInput, setUrlInput] = useState<string>('https://example.com');
  const [wsStatus, setWsStatus] = useState<string>('Disconnected');
  const [viewMode, setViewMode] = useState<'legacy' | 'preview'>('legacy');
  
  // Element Inspection States
  const [activeSelector, setActiveSelector] = useState<string>('');
  const [inspectedElement, setInspectedElement] = useState<InspectedElementData | null>(null);

  // Mapped Config Selectors (Default template JSON states)
  const [theme, setTheme] = useState<CustomTheme>({
    bgPrimary: '#000000',
    bgSecondary: '#111111',
    accent: '#ffffff',
    textPrimary: '#ffffff',
    customStyles: '/* Add your CSS overrides here */\n.sidebar { padding: 0 !important; }'
  });

  const [jsonString, setJsonString] = useState<string>('');
  const [jsonError, setJsonError] = useState<boolean>(false);

  const legacyExplorerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const rawHtmlRef = useRef<string>(''); // Holds fetched clean HTML text

  // 1. Initial build and load of JSON String
  const defaultManifest = {
    targetUrl: new URL(targetUrl).origin + "/*",
    version: "1.12.0",
    theme: {
      label: "Custom Theme",
      cssVariables: {
        "--spm-bg-primary": theme.bgPrimary,
        "--spm-bg-secondary": theme.bgSecondary,
        "--spm-text-primary": theme.textPrimary,
        "--spm-accent": theme.accent,
        "--spm-border": "#333333",
        "--spm-radius": "8px"
      },
      customStyles: theme.customStyles
    },
    components: [
      {
        name: "UiNavHeader",
        selector: "#header",
        action: "replace",
        propsMap: {
          siteName: "#site-title a | text"
        },
        children: [
          {
            name: "primaryLinks",
            selector: "#navbar a",
            scope: "document",
            propsMap: {
              label: "self | text",
              url: "self | attr:href"
            }
          }
        ]
      }
    ],
    reconstructs: [
      {
        containerSelector: "#post-list",
        layoutComponent: "UiModernGridPage",
        propsMap: {
          pageTitle: "h2 | text"
        },
        preserve: {
          sidebarSlot: "div.sidebar"
        },
        children: [
          {
            name: "items",
            selector: ".thumb",
            propsMap: {
              imageUrl: "img | attr:src",
              linkUrl: "a | attr:href",
              title: "img | attr:title",
              id: "self | attr:id"
            }
          }
        ]
      }
    ]
  };

  useEffect(() => {
    if (!jsonString) {
      setJsonString(JSON.stringify(defaultManifest, null, 2));
    }
  }, []);

  // Sync theme changes to JSON string cursor-safely
  useEffect(() => {
    if (!jsonString) return;
    try {
      const parsed = JSON.parse(jsonString);
      parsed.targetUrl = new URL(targetUrl).origin + "/*";
      if (parsed.theme) {
        parsed.theme.cssVariables = {
          ...parsed.theme.cssVariables,
          "--spm-bg-primary": theme.bgPrimary,
          "--spm-bg-secondary": theme.bgSecondary,
          "--spm-text-primary": theme.textPrimary,
          "--spm-accent": theme.accent
        };
        parsed.theme.customStyles = theme.customStyles;
      }
      const updatedStr = JSON.stringify(parsed, null, 2);
      if (jsonString !== updatedStr) {
        setJsonString(updatedStr);
      }
    } catch (e) {}
  }, [theme, targetUrl]);

  // Refetch target URL when it changes
  useEffect(() => {
    fetchHtmlDump();
    connectWebSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [targetUrl]);

  // 2. Trigger hot reload of Modern Preview on viewMode or jsonString change
  useEffect(() => {
    if (viewMode === 'preview') {
      triggerLivePreview();
    }
  }, [viewMode, jsonString]);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8080');
      socketRef.current = ws;

      ws.onopen = () => setWsStatus('Connected');
      ws.onclose = () => {
        setWsStatus('Disconnected');
        setTimeout(connectWebSocket, 5000);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'theme-update' && data.content) {
            setJsonString(JSON.stringify(data.content, null, 2));
          }
        } catch (err) {
          console.error('[SPM Sandbox] Error parsing WebSocket message:', err);
        }
      };
    } catch (e) {
      setWsStatus('Disconnected');
    }
  };

  const fetchHtmlDump = async () => {
    if (!legacyExplorerRef.current) return;
    const shadow = legacyExplorerRef.current.shadowRoot || legacyExplorerRef.current.attachShadow({ mode: 'open' });
    
    let htmlText = '';
    let fetched = false;

    // 1. Direct browser context fetch
    try {
      const response = await fetch(targetUrl, { method: 'GET' });
      if (response.ok) {
        htmlText = await response.text();
        fetched = true;
      }
    } catch (directErr) {
      console.warn('[SPM Sandbox] Direct browser fetch failed. Retrying via local proxy...', directErr);
    }

    // 2. Local CORS bypass proxy fetch fallback
    if (!fetched) {
      try {
        const proxyUrl = `http://localhost:8080/fetch?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl, { method: 'GET' });
        if (response.ok) {
          htmlText = await response.text();
          fetched = true;
        } else {
          throw new Error(`Proxy returned status ${response.status}`);
        }
      } catch (proxyErr) {
        console.error('[SPM Sandbox] Local proxy fetch failed too:', proxyErr);
      }
    }

    if (fetched) {
      // Clear scripts
      htmlText = htmlText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      rawHtmlRef.current = htmlText; // Keep a clean copy

      // Translate relative URLs to absolute
      const absoluteHtml = makeUrlsAbsolute(htmlText, targetUrl);

      // Inject base href and document structure
      const baseTag = `<base href="${new URL(targetUrl).origin}">`;
      shadow.innerHTML = `
        ${baseTag}
        <style>
          .spm-inspected-element {
            outline: 2px solid #a855f7 !important;
            outline-offset: -2px !important;
            box-shadow: 0 0 12px rgba(168, 85, 247, 0.6) !important;
            background-color: rgba(168, 85, 247, 0.05) !important;
          }
        </style>
        <div class="sandbox-fetched-content" style="width:100%; height:100%; overflow:auto;">
          ${absoluteHtml}
        </div>
      `;
    } else {
      shadow.innerHTML = `
        <div style="padding: 24px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; font-family: system-ui, sans-serif; margin: 16px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">Unable to fetch target page</h4>
          <p style="margin: 0; font-size: 12px; line-height: 1.5;">
            Could not fetch <code>${targetUrl}</code>. Make sure the local dev-server proxy is running (<code>npm run dev-server</code>) and CORS policies allow connections.
          </p>
        </div>
      `;
    }

    shadow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      if (!target || target === shadow.host) return;

      shadow.querySelectorAll('.spm-inspected-element').forEach(el => {
        el.classList.remove('spm-inspected-element');
      });

      target.classList.add('spm-inspected-element');

      const selector = computeCssSelector(target);
      setActiveSelector(selector);

      const tagName = target.tagName.toLowerCase();
      const id = target.id || '';
      const classes = Array.from(target.classList).filter(c => c !== 'spm-inspected-element');
      const text = target.textContent?.trim().slice(0, 100) || '';
      
      const attributes: Record<string, string> = {};
      for (let i = 0; i < target.attributes.length; i++) {
        const attr = target.attributes[i];
        if (attr.name !== 'class' && attr.name !== 'spm-inspected-element') {
          attributes[attr.name] = attr.value;
        }
      }

      const suggested: string[] = [];
      if (id) suggested.push(`#${id}`);
      classes.forEach(c => suggested.push(`.${c}`));
      if (classes.length > 0) suggested.push(`${tagName}.${classes[0]}`);
      suggested.push(tagName);
      suggested.push(selector);

      setInspectedElement({
        tagName,
        id,
        classes,
        attributes,
        text,
        suggestedSelectors: Array.from(new Set(suggested))
      });
    });
  };

  const computeCssSelector = (el: HTMLElement): string => {
    if (el.id) return `#${el.id}`;
    if (el.classList.contains('thumb')) return '.thumb';
    if (el.tagName.toLowerCase() === 'img') return 'img';
    if (el.tagName.toLowerCase() === 'a') return 'a';
    
    const path: string[] = [];
    let current: HTMLElement | null = el;
    while (current && current.tagName && current.tagName.toLowerCase() !== 'div') {
      let selector = current.tagName.toLowerCase();
      if (current.className) {
        const cleanClass = current.className.replace('spm-inspected-element', '').trim();
        if (cleanClass) {
          selector += `.${cleanClass.split(/\s+/)[0]}`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  };

  // Perform Live Reconstruct rendering on the preview panel
  const triggerLivePreview = () => {
    if (!previewContainerRef.current || !rawHtmlRef.current) return;
    
    try {
      const parsedManifest = JSON.parse(jsonString);
      setJsonError(false);

      // 1. Reset container HTML to clean fetched copy
      const absoluteHtml = makeUrlsAbsolute(rawHtmlRef.current, targetUrl);
      previewContainerRef.current.innerHTML = absoluteHtml;

      // 2. Execute local sandbox engine over the container
      runSandboxEngine(previewContainerRef.current, parsedManifest);
    } catch (err) {
      console.warn('[SPM Sandbox] Error rendering Live Preview:', err);
      setJsonError(true);
      previewContainerRef.current.innerHTML = `
        <div style="padding: 24px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; font-family: system-ui, sans-serif; margin: 16px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">Live Preview Compilation Error</h4>
          <p style="margin: 0; font-size: 12px; line-height: 1.5;">
            Check your JSON config syntax and layout properties.
          </p>
        </div>
      `;
    }
  };

  const handleFetchTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput) {
      setTargetUrl(urlInput);
    }
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${new URL(targetUrl).hostname}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col h-screen font-sans select-none bg-black text-[#d4d4d4]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#333333] px-6 py-3 bg-[#111111] shrink-0 gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <h1 className="text-sm font-bold text-white tracking-tight">SPM Visual Sandbox IDE</h1>
        </div>
        
        {/* Dynamic target url input */}
        <form onSubmit={handleFetchTarget} className="flex-1 max-w-[500px] flex items-center gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Target URL to modernise..."
            className="w-full bg-black border border-[#333333] px-3 py-1 text-xs text-white rounded focus:outline-none focus:border-zinc-500 font-mono"
          />
          <button 
            type="submit"
            className="px-3 py-1 bg-zinc-800 text-white rounded text-xs font-semibold hover:bg-zinc-700 transition"
          >
            Fetch
          </button>
        </form>

        <div className="flex items-center gap-4 shrink-0">
          <button 
            onClick={handleDownload}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition"
          >
            Export JSON
          </button>
          <span className={`text-[11px] border px-3 py-1 rounded font-medium ${wsStatus === 'Connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            Dev Server: {wsStatus}
          </span>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Target Theme & Active Config Bindings */}
        <aside className="w-80 border-r border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Design System Tokens</div>

          {/* Theme custom styles & vars binder */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Primary Bg Color</label>
              <input
                type="text"
                value={theme.bgPrimary}
                onChange={(e) => setTheme({ ...theme, bgPrimary: e.target.value })}
                className="w-full bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Accent Color</label>
              <input
                type="text"
                value={theme.accent}
                onChange={(e) => setTheme({ ...theme, accent: e.target.value })}
                className="w-full bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Custom CSS overrides</label>
              <textarea
                rows={10}
                value={theme.customStyles}
                onChange={(e) => setTheme({ ...theme, customStyles: e.target.value })}
                className="w-full bg-black border border-[#333333] rounded p-2 text-[10px] text-zinc-400 font-mono focus:outline-none"
              />
            </div>
          </div>
        </aside>

        {/* Center Panel: Target views (Legacy Inspector vs Modern Live Preview) */}
        <section className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
          {/* Main Visual Tabs */}
          <div className="flex border-b border-[#333333] bg-[#111111]">
            <button
              onClick={() => setViewMode('legacy')}
              className={`px-6 py-2.5 text-xs font-bold transition ${viewMode === 'legacy' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Legacy View (Inspector)
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-6 py-2.5 text-xs font-bold transition ${viewMode === 'preview' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Modern Preview (Live Run)
            </button>
          </div>

          <div className="flex-1 p-4 overflow-hidden flex flex-col relative bg-zinc-950">
            {viewMode === 'legacy' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-zinc-500 uppercase">Legacy DOM Explorer</div>
                  {activeSelector && (
                    <div className="text-[11px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-white truncate max-w-[400px]">
                      Inspecting: {activeSelector}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-white border border-[#333333] rounded overflow-auto" ref={legacyExplorerRef}></div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Modern Modernized Screen Preview</div>
                <div 
                  className="flex-1 border border-[#333333] rounded overflow-auto p-6"
                  ref={previewContainerRef}
                  style={{
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    '--spm-bg-primary': theme.bgPrimary,
                    '--spm-bg-secondary': theme.bgSecondary,
                    '--spm-bg-tertiary': '#222222',
                    '--spm-text-primary': theme.textPrimary,
                    '--spm-text-muted': '#a1a1aa',
                    '--spm-accent': theme.accent,
                    '--spm-accent-fg': '#000000',
                    '--spm-border': '#333333',
                    '--spm-radius': '8px'
                  } as any}
                ></div>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Element Details & Raw JSON output */}
        <aside className="w-80 border-l border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          
          {/* Element Inspector details */}
          {inspectedElement ? (
            <div className="border-b border-[#333333] pb-4">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Element Inspector</div>
              <div className="bg-zinc-950 border border-zinc-800 rounded p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-400">Tag</span>
                  <span className="font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">{inspectedElement.tagName}</span>
                </div>
                {inspectedElement.id && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-400">ID</span>
                    <span className="font-mono text-white bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">#{inspectedElement.id}</span>
                  </div>
                )}
                {inspectedElement.classes.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Classes</span>
                    <div className="flex flex-wrap gap-1">
                      {inspectedElement.classes.map((c, i) => (
                        <span key={i} className="text-[10px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-1 rounded truncate max-w-[120px]">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {inspectedElement.suggestedSelectors.length > 0 && (
                  <div className="mt-1">
                    <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Suggested CSS Selectors</span>
                    <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                      {inspectedElement.suggestedSelectors.map((sel, i) => (
                        <button 
                          key={i}
                          onClick={() => setActiveSelector(sel)}
                          className={`text-left font-mono text-[10px] p-1 border rounded truncate transition ${activeSelector === sel ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-black border-[#222222] text-zinc-400 hover:border-zinc-600'}`}
                        >
                          {sel}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 italic border-b border-[#333333] pb-4">
              Click elements in Legacy View to inspect classes and capture selectors.
            </div>
          )}

          {/* Consolidated raw JSON outputs */}
          <div className="flex-1 flex flex-col gap-2 min-h-[250px]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-400">Layout JSON Output</label>
              {jsonError && (
                <span className="text-[10px] text-red-400 font-medium">Invalid JSON Syntax</span>
              )}
            </div>
            <textarea
              value={jsonString}
              onChange={(e) => {
                const val = e.target.value;
                setJsonString(val);
                try {
                  const parsed = JSON.parse(val);
                  setJsonError(false);

                  // Extract targetUrl
                  if (parsed.targetUrl) {
                    const clean = parsed.targetUrl.replace(/\/\*$/, '');
                    if (clean !== targetUrl) {
                      setTargetUrl(clean);
                      setUrlInput(clean);
                    }
                  }

                  // Extract theme tokens
                  if (parsed.theme) {
                    setTheme({
                      bgPrimary: parsed.theme.cssVariables?.['--spm-bg-primary'] || theme.bgPrimary,
                      bgSecondary: parsed.theme.cssVariables?.['--spm-bg-secondary'] || theme.bgSecondary,
                      accent: parsed.theme.cssVariables?.['--spm-accent'] || theme.accent,
                      textPrimary: parsed.theme.cssVariables?.['--spm-text-primary'] || theme.textPrimary,
                      customStyles: parsed.theme.customStyles || ''
                    });
                  }
                } catch (err) {
                  setJsonError(true);
                }
              }}
              rows={15}
              className={`flex-1 bg-black border rounded p-3 text-[10px] text-zinc-400 font-mono focus:outline-none focus:text-white resize-none ${jsonError ? 'border-red-500/50 focus:border-red-500' : 'border-[#333333] focus:border-zinc-500'}`}
              placeholder="Paste or edit config JSON..."
            />
          </div>
        </aside>
      </main>
    </div>
  );
}

const rootEl = document.getElementById('sandbox-root');
if (rootEl) {
  createRoot(rootEl).render(<SandboxApp />);
}
