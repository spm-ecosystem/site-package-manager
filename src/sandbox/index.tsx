import { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '../content/content.css';

interface PrimitiveElement {
  id: string;
  name: string;
  className: string;
  selector?: string;
  attribute?: string;
  content?: string;
}

interface CustomTheme {
  bgPrimary: string;
  bgSecondary: string;
  accent: string;
  textPrimary: string;
  customStyles: string;
}

type LayoutType = 'gallery' | 'post';

function SandboxApp() {
  const [targetUrl, setTargetUrl] = useState<string>('https://safebooru.org/index.php?page=post&s=list');
  const [urlInput, setUrlInput] = useState<string>('https://safebooru.org/index.php?page=post&s=list');
  const [wsStatus, setWsStatus] = useState<string>('Disconnected');
  const [activeSelector, setActiveSelector] = useState<string>('');
  const [elementsList, setElementsList] = useState<PrimitiveElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Theme state
  const [theme, setTheme] = useState<CustomTheme>({
    bgPrimary: '#000000',
    bgSecondary: '#111111',
    accent: '#ffffff',
    textPrimary: '#ffffff',
    customStyles: '/* Add your CSS overrides here */\n.sidebar { padding: 0 !important; }'
  });

  // Reconstructor Layout selector
  const [layoutType, setLayoutType] = useState<LayoutType>('gallery');

  const legacyExplorerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchHtmlDump();
    connectWebSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [targetUrl]); // Refetch when targetUrl changes

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
          if (data.type === 'theme-update' && data.content?.reconstructs?.[0]) {
            const config = data.content.reconstructs[0];
            const loaded: PrimitiveElement[] = [];
            if (config.children) {
              config.children.forEach((child: any, idx: number) => {
                loaded.push({
                  id: `elem-${idx}-${Date.now()}`,
                  name: 'UiImageCard',
                  className: 'w-48 bg-zinc-900 border border-zinc-800 rounded p-2',
                  selector: child.selector,
                  attribute: child.propsMap?.imageUrl?.split('|')?.[1]?.trim() || ''
                });
              });
            }
            setElementsList(loaded);
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
    
    try {
      // 1. Attempt to fetch real page html
      const response = await fetch(targetUrl, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      let htmlText = await response.text();

      // 2. Clear script tags to prevent running scripts from breaking the sandbox
      htmlText = htmlText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      // 3. Inject base href and the fetched HTML to resolve relative styles/images natively
      const baseTag = `<base href="${new URL(targetUrl).origin}">`;
      shadow.innerHTML = `
        ${baseTag}
        <div class="sandbox-fetched-content" style="width:100%; height:100%; overflow:auto;">
          ${htmlText}
        </div>
      `;
    } catch (err) {
      console.warn('[SPM Sandbox] Live fetch failed. Error:', err);
      shadow.innerHTML = `
        <div style="padding: 24px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; font-family: system-ui, sans-serif; margin: 16px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">Unable to fetch target page</h4>
          <p style="margin: 0; font-size: 12px; line-height: 1.5;">
            Could not fetch <code>${targetUrl}</code>. Make sure the server is reachable and CORS policies allow connections.
            You can still inspect any elements by entering a different URL in the fetch bar.
          </p>
        </div>
      `;
    }

    shadow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target) {
        const selector = computeCssSelector(target);
        setActiveSelector(selector);
      }
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
        selector += `.${current.className.trim().split(/\s+/)[0]}`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  };

  const addPrimitiveToCanvas = (name: string) => {
    const newElem: PrimitiveElement = {
      id: `elem-${Date.now()}`,
      name,
      className: name === 'UiBox' ? 'p-4 bg-zinc-950 border border-zinc-800 rounded' : 'p-2 text-white',
      content: name === 'UiText' ? 'Label Text' : undefined
    };
    setElementsList([...elementsList, newElem]);
    setSelectedElementId(newElem.id);
  };

  const updateSelectedElement = (updates: Partial<PrimitiveElement>) => {
    setElementsList(elementsList.map(el => el.id === selectedElementId ? { ...el, ...updates } : el));
  };

  const activeElement = elementsList.find(el => el.id === selectedElementId);

  // Compile JSON dynamically based on type, selectors and style inputs
  const compiledJson = {
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
        "name": "UiNavHeader",
        "selector": "#header",
        "action": "replace",
        "propsMap": {
          "siteName": "#site-title a | text"
        },
        "children": [
          {
            "name": "primaryLinks",
            "selector": "#navbar a",
            "scope": "document",
            "propsMap": {
              "label": "self | text",
              "url": "self | attr:href"
            }
          }
        ]
      }
    ],
    reconstructs: [
      layoutType === 'gallery' ? {
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
            selector: elementsList.find(e => e.name === 'UiImageCard')?.selector || ".thumb",
            propsMap: {
              imageUrl: "img | attr:src",
              linkUrl: "a | attr:href",
              title: "img | attr:title",
              id: "self | attr:id"
            }
          }
        ]
      } : {
        containerSelector: "div.content:has(#image)",
        layoutComponent: "UiPostDetails",
        propsMap: {
          imageUrl: "#image | attr:src",
          statisticsHtml: "#tag-sidebar ul:last-child | html"
        },
        props: {
          showSearch: true,
          searchSubmitUrl: new URL(targetUrl).origin + "/index.php?page=post&s=list",
          searchParamName: "tags"
        },
        children: [
          {
            name: "buttons",
            selector: elementsList.find(e => e.name === 'UiLink')?.selector || "#tag-sidebar .related-posts a",
            scope: "document",
            propsMap: {
              label: "self | text",
              url: "self | attr:href"
            }
          },
          {
            name: "tags",
            selector: "#tag-sidebar li",
            scope: "document",
            propsMap: {
              name: "a:nth-child(2) | text",
              count: "span | text",
              type: "self | attr:class",
              url: "a:nth-child(2) | attr:href"
            }
          }
        ]
      }
    ]
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(compiledJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${new URL(targetUrl).hostname}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFetchTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput) {
      setTargetUrl(urlInput);
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans select-none bg-black text-[#d4d4d4]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#333333] px-6 py-3 bg-[#111111] shrink-0 gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <h1 className="text-sm font-bold text-white tracking-tight font-sans">SPM Visual Sandbox IDE</h1>
        </div>
        
        {/* Dynamic target url input */}
        <form onSubmit={handleFetchTarget} className="flex-1 max-w-[500px] flex items-center gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Target URL..."
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
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition font-sans"
          >
            Export JSON
          </button>
          <span className={`text-[11px] border px-3 py-1 rounded font-medium font-sans ${wsStatus === 'Connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            Dev Server: {wsStatus}
          </span>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Elements & Styling Palette */}
        <aside className="w-72 border-r border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          {/* Layout Type Selection */}
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-sans">Layout Type</div>
            <div className="flex gap-2">
              <button
                onClick={() => setLayoutType('gallery')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold border ${layoutType === 'gallery' ? 'bg-white text-black border-white' : 'bg-[#222222] border-[#333333] text-white hover:border-zinc-500'}`}
              >
                Gallery List
              </button>
              <button
                onClick={() => setLayoutType('post')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold border ${layoutType === 'post' ? 'bg-white text-black border-white' : 'bg-[#222222] border-[#333333] text-white hover:border-zinc-500'}`}
              >
                Post Details
              </button>
            </div>
          </div>

          {/* Primitive Elements */}
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-sans">Components Palette</div>
            <div className="grid grid-cols-2 gap-2">
              {['UiBox', 'UiGrid', 'UiFlexRow', 'UiText', 'UiImage', 'UiLink'].map(item => (
                <button 
                  key={item} 
                  onClick={() => addPrimitiveToCanvas(item)}
                  className="p-2.5 bg-[#222222] border border-[#333333] hover:border-zinc-500 rounded text-center text-xs text-white font-medium transition font-sans"
                >
                  {item}
                </button>
              ))}
            </div>
            <button 
              onClick={() => addPrimitiveToCanvas('UiImageCard')}
              className="w-full mt-2 p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-500 rounded text-center text-xs text-indigo-400 font-semibold transition font-sans"
            >
              + UiImageCard
            </button>
          </div>

          {/* Theme custom styles & vars binder */}
          <div className="border-t border-[#333333] pt-4 flex flex-col gap-3">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-sans">Theme Tokens</div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Primary Bg Color</label>
              <input
                type="text"
                value={theme.bgPrimary}
                onChange={(e) => setTheme({ ...theme, bgPrimary: e.target.value })}
                className="w-full bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Accent Accent</label>
              <input
                type="text"
                value={theme.accent}
                onChange={(e) => setTheme({ ...theme, accent: e.target.value })}
                className="w-full bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Custom CSS rules</label>
              <textarea
                rows={4}
                value={theme.customStyles}
                onChange={(e) => setTheme({ ...theme, customStyles: e.target.value })}
                className="w-full bg-black border border-[#333333] rounded p-2 text-[10px] text-zinc-400 font-mono focus:outline-none"
              />
            </div>
          </div>
        </aside>

        {/* Center Panel: Inspector & Composition Canvas */}
        <section className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
          {/* Legacy Web View mock */}
          <div className="flex-1 border-b border-[#333333] p-4 flex flex-col overflow-hidden min-h-[250px]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-zinc-500 uppercase font-sans">Legacy DOM Explorer</div>
              {activeSelector && (
                <div className="text-[11px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-white truncate max-w-[400px]">
                  Active Selector: {activeSelector}
                </div>
              )}
            </div>
            <div className="flex-1 bg-white border border-[#333333] rounded overflow-auto" ref={legacyExplorerRef}></div>
          </div>

          {/* Visual Workspace Canvas */}
          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            <div className="text-xs font-bold text-zinc-500 uppercase mb-2 font-sans">Modern Layout Canvas (Preview)</div>
            <div className="flex-1 bg-black border border-[#333333] rounded p-4 overflow-y-auto flex flex-wrap gap-4 items-start justify-center">
              {elementsList.length === 0 ? (
                <div className="text-xs text-zinc-600 mt-12 font-sans">Canvas is empty. Drag or add elements from the left panel.</div>
              ) : (
                elementsList.map(el => (
                  <div 
                    key={el.id} 
                    onClick={() => setSelectedElementId(el.id)}
                    className={`p-3 bg-zinc-950 rounded border cursor-pointer hover:border-zinc-500 transition relative min-w-[120px] ${selectedElementId === el.id ? 'border-white' : 'border-[#333333]'}`}
                  >
                    <div className="text-[10px] text-zinc-500 font-mono mb-1">{el.name}</div>
                    <div className="text-xs text-white truncate max-w-[120px] font-sans">
                      {el.selector ? `bind: ${el.selector}` : 'Unbound selector'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right Panel: Active Element Binder & Output JSON */}
        <aside className="w-80 border-l border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0 font-sans">
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Properties Inspector</div>
            {activeElement ? (
              <div className="flex flex-col gap-3 bg-black/40 border border-[#333333] p-3 rounded-lg">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">Component Block</label>
                  <div className="text-xs text-white font-mono bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded mt-1">{activeElement.name}</div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">Tailwind Classes</label>
                  <input
                    type="text"
                    value={activeElement.className}
                    onChange={(e) => updateSelectedElement({ className: e.target.value })}
                    className="w-full bg-black border border-[#333333] rounded mt-1 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-sans"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">Selector Binding</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="e.g. .thumb img"
                      value={activeElement.selector || ''}
                      onChange={(e) => updateSelectedElement({ selector: e.target.value })}
                      className="flex-1 bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-sans"
                    />
                    <button 
                      disabled={!activeSelector}
                      onClick={() => updateSelectedElement({ selector: activeSelector })}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[11px] font-semibold transition disabled:opacity-50 font-sans"
                    >
                      Fill
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-600 italic font-sans">Select an element on canvas to inspect properties.</div>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
            <label className="text-[11px] font-semibold text-zinc-400">Layout JSON Output</label>
            <pre className="flex-1 bg-black border border-[#333333] rounded p-3 text-[10px] text-zinc-400 font-mono overflow-auto max-h-[300px]">
              {JSON.stringify(compiledJson, null, 2)}
            </pre>
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
