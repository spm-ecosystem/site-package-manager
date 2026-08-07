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

interface RegistryItem {
  id: string;
  name: string;
  description: string;
  domain: string;
  manifestPath: string;
}

function SandboxApp() {
  const [targetUrl] = useState<string>('https://safebooru.org/index.php?page=post&s=list');
  const [wsStatus, setWsStatus] = useState<string>('Disconnected');
  const [activeSelector, setActiveSelector] = useState<string>('');
  const [elementsList, setElementsList] = useState<PrimitiveElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const legacyExplorerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Fetch and inject mock legacy page DOM nodes
    fetchHtmlDump();

    // 2. Setup WebSocket Live synchronization
    connectWebSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://localhost:8080');
      socketRef.current = ws;

      ws.onopen = () => setWsStatus('Connected');
      ws.onclose = () => {
        setWsStatus('Disconnected');
        setTimeout(connectWebSocket, 5000); // Reconnection retry
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
    if (legacyExplorerRef.current) {
      const shadow = legacyExplorerRef.current.shadowRoot || legacyExplorerRef.current.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          .legacy-container { padding: 16px; background: #ffffff; color: #333333; font-family: system-ui, sans-serif; min-height: 200px; }
          .thumb { display: inline-block; padding: 8px; border: 1px dashed #cccccc; margin: 6px; cursor: pointer; border-radius: 4px; transition: all 0.15s; }
          .thumb:hover { background: #f0f6ff; border-color: #3b82f6; }
          .pagination { margin: 12px 0; font-weight: bold; color: #111827; }
          .sidebar { width: 140px; float: left; border-right: 1px solid #e5e7eb; padding-right: 8px; }
          h2 { font-size: 20px; margin-top: 0; margin-bottom: 12px; color: #111827; }
          ul { padding-left: 18px; margin: 6px 0; }
          li { font-size: 13px; color: #4b5563; }
        </style>
        <div class="legacy-container">
          <div class="sidebar">
            <h2>Tags</h2>
            <ul>
              <li>solo (321)</li>
              <li>original (112)</li>
            </ul>
          </div>
          <div style="margin-left: 160px;">
            <h2>Safebooru Gallery</h2>
            <div class="pagination"><b>1</b> <a href="#">2</a> <a href="#">3</a></div>
            <div id="post-list">
              <span class="thumb" id="p1234">
                <a href="index.php?id=1234"><img src="https://safebooru.org/thumbnails/3909/thumbnail_6cb6cbfad7e.jpg" title="1234 solo original" /></a>
              </span>
              <span class="thumb" id="p1235">
                <a href="index.php?id=1235"><img src="https://safebooru.org/thumbnails/3909/thumbnail_6cb6cbfad7f.jpg" title="1235 solo scenic" /></a>
              </span>
            </div>
          </div>
        </div>
      `;

      shadow.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLElement;
        if (target) {
          const selector = computeCssSelector(target);
          setActiveSelector(selector);
        }
      });
    }
  };

  const computeCssSelector = (el: HTMLElement): string => {
    if (el.id) return `#${el.id}`;
    if (el.classList.contains('thumb')) return '.thumb';
    
    const path: string[] = [];
    let current: HTMLElement | null = el;
    while (current && current.tagName && current.tagName.toLowerCase() !== 'div' && current.id !== 'post-list') {
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

  const compiledJson = {
    targetUrl: "*://safebooru.org/*",
    theme: {
      cssVariables: {
        "--bg-color": "#000000",
        "--text-color": "#ffffff"
      }
    },
    reconstructs: [
      {
        containerSelector: "#post-list",
        layoutComponent: "UiModernGridPage",
        propsMap: {
          pageTitle: "h2 | text"
        },
        preserve: {
          paginationSlot: "div.pagination",
          sidebarSlot: "div.sidebar"
        },
        children: elementsList.map(el => ({
          name: "items",
          selector: el.selector || ".thumb",
          propsMap: {
            imageUrl: el.name === 'UiImage' || el.name === 'UiImageCard' ? `img | attr:src` : undefined,
            linkUrl: `a | attr:href`,
            title: `img | attr:title`,
            id: `self | attr:id`
          }
        }))
      }
    ]
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(compiledJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "safebooru.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col h-screen font-sans select-none bg-black text-[#d4d4d4]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#333333] px-6 py-3 bg-[#111111] shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-bold text-white tracking-tight font-sans">SPM Visual Sandbox IDE</h1>
          <span className="text-xs text-zinc-500 truncate max-w-[300px] font-sans">URL: {targetUrl}</span>
        </div>
        <div className="flex items-center gap-4">
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
        
        {/* Left Elements Palette */}
        <aside className="w-64 border-r border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 shrink-0">
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-sans">Primitives Canvas</div>
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
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 font-sans">Custom Blocks</div>
            <button 
              onClick={() => addPrimitiveToCanvas('UiImageCard')}
              className="w-full p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-500 rounded text-center text-xs text-indigo-400 font-semibold transition font-sans"
            >
              + UiImageCard
            </button>
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
