import { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '../content/content.css';
import { PRIMITIVE_COMPONENTS, DEDICATED_COMPONENTS } from '../components/registry';

interface PrimitiveElement {
  id: string;
  name: string;
  className: string;
  selector?: string;
  propsMap?: Record<string, string>;
  childrenConfigs?: { name: string; selector: string; propsMap: Record<string, string> }[];
}

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

type LayoutType = 'gallery' | 'post';

function SandboxApp() {
  const [targetUrl, setTargetUrl] = useState<string>('https://example.com');
  const [urlInput, setUrlInput] = useState<string>('https://example.com');
  const [wsStatus, setWsStatus] = useState<string>('Disconnected');
  
  // Element Inspection States
  const [activeSelector, setActiveSelector] = useState<string>('');
  const [inspectedElement, setInspectedElement] = useState<InspectedElementData | null>(null);

  // Canvas and selection
  const [elementsList, setElementsList] = useState<PrimitiveElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Dragging States for Canvas Reordering
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [draggedPaletteItem, setDraggedPaletteItem] = useState<string | null>(null);

  // Theme states
  const [theme, setTheme] = useState<CustomTheme>({
    bgPrimary: '#000000',
    bgSecondary: '#111111',
    accent: '#ffffff',
    textPrimary: '#ffffff',
    customStyles: '/* Add your CSS overrides here */\n.sidebar { padding: 0 !important; }'
  });

  const [layoutType, setLayoutType] = useState<LayoutType>('gallery');

  const legacyExplorerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchHtmlDump();
    connectWebSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [targetUrl]);

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
                  propsMap: child.propsMap || {}
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
      console.warn('[SPM Sandbox] Direct browser fetch failed (CORS likely). Retrying via local proxy...', directErr);
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
      // Clean script tags
      htmlText = htmlText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      // Inject base href and document structure
      const baseTag = `<base href="${new URL(targetUrl).origin}">`;
      shadow.innerHTML = `
        ${baseTag}
        <style>
          /* Highlight style for inspected element */
          .spm-inspected-element {
            outline: 2px solid #a855f7 !important;
            outline-offset: -2px !important;
            box-shadow: 0 0 12px rgba(168, 85, 247, 0.6) !important;
            background-color: rgba(168, 85, 247, 0.05) !important;
          }
        </style>
        <div class="sandbox-fetched-content" style="width:100%; height:100%; overflow:auto;">
          ${htmlText}
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

    // Attach click inspection event listener
    shadow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      if (!target || target === shadow.host) return;

      // Clear previous inspected highlight outlines
      shadow.querySelectorAll('.spm-inspected-element').forEach(el => {
        el.classList.remove('spm-inspected-element');
      });

      // Highlight current inspected element
      target.classList.add('spm-inspected-element');

      // Generate Suggested CSS selectors
      const selector = computeCssSelector(target);
      setActiveSelector(selector);

      // Inspect details
      const tagName = target.tagName.toLowerCase();
      const id = target.id || '';
      const classes = Array.from(target.classList).filter(c => c !== 'spm-inspected-element');
      const text = target.textContent?.trim().slice(0, 100) || '';
      
      // Read element attributes
      const attributes: Record<string, string> = {};
      for (let i = 0; i < target.attributes.length; i++) {
        const attr = target.attributes[i];
        if (attr.name !== 'class' && attr.name !== 'spm-inspected-element') {
          attributes[attr.name] = attr.value;
        }
      }

      // Generate suggested selectors list
      const suggested: string[] = [];
      if (id) suggested.push(`#${id}`);
      classes.forEach(c => suggested.push(`.${c}`));
      if (classes.length > 0) suggested.push(`${tagName}.${classes[0]}`);
      suggested.push(tagName);
      suggested.push(selector); // Hierarchical path

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

  // Add new element to composition list
  const addPrimitiveToCanvas = (name: string) => {
    const newElem: PrimitiveElement = {
      id: `elem-${Date.now()}`,
      name,
      className: name.startsWith('UiFlex') || name === 'UiBox' ? 'p-4 bg-zinc-950 border border-zinc-800 rounded' : 'p-2 text-white',
      selector: '',
      propsMap: {},
      childrenConfigs: []
    };
    
    // Add default template properties for components
    if (name === 'UiImageCard') {
      newElem.propsMap = { imageUrl: 'img | attr:src', linkUrl: 'a | attr:href', title: 'img | attr:title' };
    } else if (name === 'UiPostDetails') {
      newElem.propsMap = { imageUrl: '#image | attr:src', statisticsHtml: '.sidebar | html' };
      newElem.childrenConfigs = [
        { name: 'buttons', selector: '.sidebar a', propsMap: { label: 'self | text', url: 'self | attr:href' } },
        { name: 'tags', selector: '.sidebar li', propsMap: { name: 'a | text', count: 'span | text', type: 'self | attr:class', url: 'a | attr:href' } }
      ];
    } else if (name === 'UiSearchBar') {
      newElem.propsMap = { defaultValue: 'input | attr:value' };
    }

    setElementsList([...elementsList, newElem]);
    setSelectedElementId(newElem.id);
  };

  const updateSelectedElement = (updates: Partial<PrimitiveElement>) => {
    setElementsList(elementsList.map(el => el.id === selectedElementId ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setElementsList(elementsList.filter(el => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const clearCanvas = () => {
    setElementsList([]);
    setSelectedElementId(null);
  };

  // Drag and Drop Canvas Reordering
  const handleDragStart = (id: string) => {
    setDraggedElementId(id);
    setDraggedPaletteItem(null);
  };

  const handlePaletteDragStart = (name: string) => {
    setDraggedPaletteItem(name);
    setDraggedElementId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnCanvas = () => {
    if (draggedPaletteItem) {
      addPrimitiveToCanvas(draggedPaletteItem);
      setDraggedPaletteItem(null);
    }
  };

  const handleDropOnElement = (targetId: string) => {
    if (draggedElementId && draggedElementId !== targetId) {
      const draggedIdx = elementsList.findIndex(e => e.id === draggedElementId);
      const targetIdx = elementsList.findIndex(e => e.id === targetId);
      const updated = [...elementsList];
      const [removed] = updated.splice(draggedIdx, 1);
      updated.splice(targetIdx, 0, removed);
      setElementsList(updated);
      setDraggedElementId(null);
    }
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
    components: elementsList.map(el => ({
      name: el.name,
      selector: el.selector || ".target-class",
      action: "replace",
      propsMap: el.propsMap || {},
      children: el.childrenConfigs || undefined
    })),
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
          imageUrl: elementsList.find(e => e.name === 'UiPostDetails')?.propsMap?.imageUrl || "#image | attr:src",
          statisticsHtml: elementsList.find(e => e.name === 'UiPostDetails')?.propsMap?.statisticsHtml || "#tag-sidebar ul:last-child | html"
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

  // Preenche a propriedade ativa com o seletor inspecionado
  const fillSelectorField = (key: string, isChild: boolean = false, childName: string = '') => {
    if (!activeSelector) return;
    if (isChild && childName && activeElement?.childrenConfigs) {
      const updatedChildren = activeElement.childrenConfigs.map(c => 
        c.name === childName ? { ...c, selector: activeSelector } : c
      );
      updateSelectedElement({ childrenConfigs: updatedChildren });
    } else if (activeElement?.propsMap) {
      const updatedProps = { ...activeElement.propsMap, [key]: activeSelector };
      updateSelectedElement({ propsMap: updatedProps });
    } else {
      updateSelectedElement({ selector: activeSelector });
    }
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
        
        {/* Left Elements & Styling Palette */}
        <aside className="w-72 border-r border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          {/* Layout Type Selection */}
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Layout Template</div>
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

          {/* Primitives Palette */}
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Primitives Palette</div>
            <div className="grid grid-cols-2 gap-2">
              {PRIMITIVE_COMPONENTS.map(item => (
                <div 
                  key={item} 
                  draggable
                  onDragStart={() => handlePaletteDragStart(item)}
                  onClick={() => addPrimitiveToCanvas(item)}
                  className="p-2 bg-[#222222] border border-[#333333] hover:border-zinc-500 rounded text-center text-xs text-white font-medium transition cursor-grab"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Dedicated Custom Blocks */}
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Dedicated Blocks</div>
            <div className="flex flex-col gap-2">
              {DEDICATED_COMPONENTS.map(item => (
                <div 
                  key={item}
                  draggable
                  onDragStart={() => handlePaletteDragStart(item)}
                  onClick={() => addPrimitiveToCanvas(item)}
                  className="w-full p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-500 rounded text-center text-xs text-indigo-400 font-semibold transition cursor-grab"
                >
                  + {item}
                </div>
              ))}
            </div>
          </div>

          {/* Theme custom styles & vars binder */}
          <div className="border-t border-[#333333] pt-4 flex flex-col gap-3">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Theme Tokens</div>
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
              <label className="text-[10px] text-zinc-400 block mb-1">Accent Color</label>
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
          {/* Legacy Web View */}
          <div className="flex-1 border-b border-[#333333] p-4 flex flex-col overflow-hidden min-h-[300px]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-zinc-500 uppercase">Legacy DOM Explorer</div>
              {activeSelector && (
                <div className="text-[11px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-white truncate max-w-[400px]">
                  Active Selector: {activeSelector}
                </div>
              )}
            </div>
            <div className="flex-1 bg-white border border-[#333333] rounded overflow-auto" ref={legacyExplorerRef}></div>
          </div>

          {/* Visual Workspace Canvas */}
          <div 
            className="flex-1 p-4 flex flex-col overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={handleDropOnCanvas}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-zinc-500 uppercase">Modern Layout Canvas (Preview)</div>
              {elementsList.length > 0 && (
                <button 
                  onClick={clearCanvas}
                  className="text-[10px] text-red-400 hover:text-red-300 font-semibold px-2 py-0.5 border border-red-500/30 rounded bg-red-500/5 transition"
                >
                  Clear Canvas
                </button>
              )}
            </div>
            <div className="flex-1 bg-black border border-[#333333] rounded p-4 overflow-y-auto flex flex-wrap gap-4 items-start justify-center">
              {elementsList.length === 0 ? (
                <div className="text-xs text-zinc-600 mt-12 text-center">
                  Canvas is empty.<br />Click palette items on the left or drag them here to compose the modern page.
                </div>
              ) : (
                elementsList.map(el => (
                  <div 
                    key={el.id} 
                    draggable
                    onDragStart={() => handleDragStart(el.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropOnElement(el.id)}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`p-3 bg-zinc-950 rounded border cursor-pointer hover:border-zinc-500 transition relative min-w-[150px] group ${selectedElementId === el.id ? 'border-white' : 'border-[#333333]'}`}
                  >
                    {/* Delete button */}
                    <button 
                      onClick={(e) => deleteElement(el.id, e)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition"
                      title="Remove element"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <div className="text-[10px] text-indigo-400 font-mono mb-1">{el.name}</div>
                    <div className="text-xs text-white truncate max-w-[130px] font-sans">
                      {el.selector ? `bind: ${el.selector}` : 'Unbound selector'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right Panel: Active Element Binder & Output JSON */}
        <aside className="w-80 border-l border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          
          {/* Element Inspector details */}
          {inspectedElement && (
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
                    <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto">
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
          )}

          {/* Properties Inspector */}
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
                    className="w-full bg-black border border-[#333333] rounded mt-1 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Primary Selector Binding */}
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">Root Selector Binding</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="e.g. .thumb"
                      value={activeElement.selector || ''}
                      onChange={(e) => updateSelectedElement({ selector: e.target.value })}
                      className="flex-1 bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                    />
                    <button 
                      disabled={!activeSelector}
                      onClick={() => updateSelectedElement({ selector: activeSelector })}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[11px] font-semibold transition disabled:opacity-50"
                      title="Use selected selector"
                    >
                      Fill
                    </button>
                  </div>
                </div>

                {/* Dynamic propsMap fields depending on components */}
                {activeElement.propsMap && Object.keys(activeElement.propsMap).map(key => (
                  <div key={key} className="border-t border-[#222222] pt-2">
                    <label className="text-[10px] font-semibold text-purple-400">prop: {key}</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={activeElement.propsMap?.[key] || ''}
                        onChange={(e) => {
                          const updated = { ...(activeElement.propsMap || {}), [key]: e.target.value };
                          updateSelectedElement({ propsMap: updated });
                        }}
                        className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                      />
                      <button 
                        disabled={!activeSelector}
                        onClick={() => fillSelectorField(key)}
                        className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded text-[10px] font-medium transition disabled:opacity-50"
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                ))}

                {/* Dynamic children configurations */}
                {activeElement.childrenConfigs && activeElement.childrenConfigs.map(c => (
                  <div key={c.name} className="border-t border-[#222222] pt-2">
                    <label className="text-[10px] font-semibold text-indigo-400">child collection: {c.name}</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Child selector..."
                        value={c.selector}
                        onChange={(e) => {
                          const updated = activeElement.childrenConfigs!.map(child => 
                            child.name === c.name ? { ...child, selector: e.target.value } : child
                          );
                          updateSelectedElement({ childrenConfigs: updated });
                        }}
                        className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                      />
                      <button 
                        disabled={!activeSelector}
                        onClick={() => fillSelectorField(c.name, true, c.name)}
                        className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-medium transition disabled:opacity-50"
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-600 italic">Select an element on canvas to inspect or map properties.</div>
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
