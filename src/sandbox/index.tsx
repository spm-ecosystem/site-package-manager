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

type LayoutType = 'gallery' | 'post';

function SandboxApp() {
  const [targetUrl, setTargetUrl] = useState<string>('https://example.com');
  const [urlInput, setUrlInput] = useState<string>('https://example.com');
  const [wsStatus, setWsStatus] = useState<string>('Disconnected');
  const [viewMode, setViewMode] = useState<'legacy' | 'preview'>('legacy');
  
  // Element Inspection States
  const [activeSelector, setActiveSelector] = useState<string>('');
  const [inspectedElement, setInspectedElement] = useState<InspectedElementData | null>(null);

  // Mapped Config Selectors (Consolidated state for layout mapping)
  const [galleryProps, setGalleryProps] = useState({
    containerSelector: '#post-list',
    pageTitleRule: 'h2 | text',
    itemsSelector: '.thumb',
    imageUrlRule: 'img | attr:src',
    linkUrlRule: 'a | attr:href',
    titleRule: 'img | attr:title',
    idRule: 'self | attr:id',
    paginationSelector: 'div.pagination a'
  });

  const [postProps, setPostProps] = useState({
    containerSelector: 'div.content:has(#image)',
    imageUrlRule: '#image | attr:src',
    statisticsHtmlRule: '#tag-sidebar ul:last-child | html',
    buttonsSelector: '#tag-sidebar .related-posts a',
    tagsSelector: '#tag-sidebar li',
    tagNameRule: 'a:nth-child(2) | text',
    tagCountRule: 'span | text',
    tagTypeRule: 'self | attr:class',
    tagUrlRule: 'a:nth-child(2) | attr:href'
  });

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
            if (config.layoutComponent === 'UiModernGridPage') {
              setLayoutType('gallery');
              setGalleryProps(prev => ({
                ...prev,
                containerSelector: config.containerSelector,
                pageTitleRule: config.propsMap?.pageTitle || '',
                itemsSelector: config.children?.[0]?.selector || '',
                imageUrlRule: config.children?.[0]?.propsMap?.imageUrl || '',
                linkUrlRule: config.children?.[0]?.propsMap?.linkUrl || '',
                titleRule: config.children?.[0]?.propsMap?.title || '',
                idRule: config.children?.[0]?.propsMap?.id || '',
                paginationSelector: config.children?.[1]?.selector || ''
              }));
            } else if (config.layoutComponent === 'UiPostDetails') {
              setLayoutType('post');
              setPostProps(prev => ({
                ...prev,
                containerSelector: config.containerSelector,
                imageUrlRule: config.propsMap?.imageUrl || '',
                statisticsHtmlRule: config.propsMap?.statisticsHtml || '',
                buttonsSelector: config.children?.[0]?.selector || '',
                tagsSelector: config.children?.[1]?.selector || '',
                tagNameRule: config.children?.[1]?.propsMap?.name || '',
                tagCountRule: config.children?.[1]?.propsMap?.count || '',
                tagTypeRule: config.children?.[1]?.propsMap?.type || '',
                tagUrlRule: config.children?.[1]?.propsMap?.url || ''
              }));
            }
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
      // Clean script tags
      htmlText = htmlText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

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

  // Compile JSON dynamically based on active fields
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
        containerSelector: galleryProps.containerSelector,
        layoutComponent: "UiModernGridPage",
        propsMap: {
          pageTitle: galleryProps.pageTitleRule
        },
        preserve: {
          sidebarSlot: "div.sidebar"
        },
        children: [
          {
            name: "items",
            selector: galleryProps.itemsSelector,
            propsMap: {
              imageUrl: galleryProps.imageUrlRule,
              linkUrl: galleryProps.linkUrlRule,
              title: galleryProps.titleRule,
              id: galleryProps.idRule
            }
          },
          {
            name: "pageLinks",
            selector: galleryProps.paginationSelector,
            propsMap: {
              label: "self | text",
              url: "self | attr:href"
            }
          }
        ]
      } : {
        containerSelector: postProps.containerSelector,
        layoutComponent: "UiPostDetails",
        propsMap: {
          imageUrl: postProps.imageUrlRule,
          statisticsHtml: postProps.statisticsHtmlRule
        },
        props: {
          showSearch: true,
          searchSubmitUrl: new URL(targetUrl).origin + "/index.php?page=post&s=list",
          searchParamName: "tags"
        },
        children: [
          {
            name: "buttons",
            selector: postProps.buttonsSelector,
            scope: "document",
            propsMap: {
              label: "self | text",
              url: "self | attr:href"
            }
          },
          {
            name: "tags",
            selector: postProps.tagsSelector,
            scope: "document",
            propsMap: {
              name: postProps.tagNameRule,
              count: postProps.tagCountRule,
              type: postProps.tagTypeRule,
              url: postProps.tagUrlRule
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

  // Preenche a propriedade ativa selecionada
  const fillInspectedSelector = (category: 'gallery' | 'post', field: string) => {
    if (!activeSelector) return;
    if (category === 'gallery') {
      setGalleryProps({ ...galleryProps, [field]: activeSelector });
    } else {
      setPostProps({ ...postProps, [field]: activeSelector });
    }
  };

  // Executa a extração em tempo de execução e retorna os elementos processados
  const getPreviewData = () => {
    const shadow = legacyExplorerRef.current?.shadowRoot;
    if (!shadow) return null;

    if (layoutType === 'gallery') {
      const container = shadow.querySelector(galleryProps.containerSelector);
      if (!container) return { error: `Container ${galleryProps.containerSelector} not found` };

      // Page Title
      const pageTitle = extractValue(container as HTMLElement, galleryProps.pageTitleRule);

      // Extract items list
      const items: any[] = [];
      const itemNodes = container.querySelectorAll(galleryProps.itemsSelector);
      itemNodes.forEach(node => {
        items.push({
          imageUrl: extractValue(node as HTMLElement, galleryProps.imageUrlRule),
          linkUrl: extractValue(node as HTMLElement, galleryProps.linkUrlRule),
          title: extractValue(node as HTMLElement, galleryProps.titleRule),
          id: extractValue(node as HTMLElement, galleryProps.idRule)
        });
      });

      // Pagination links
      const pageLinks: any[] = [];
      const linkNodes = shadow.querySelectorAll(galleryProps.paginationSelector);
      linkNodes.forEach(node => {
        pageLinks.push({
          label: node.textContent?.trim() || '',
          url: node.getAttribute('href') || '#'
        });
      });

      return {
        layoutComponent: 'UiModernGridPage',
        props: {
          pageTitle,
          items,
          pageLinks
        }
      };
    } else {
      // Post View layout
      const container = shadow.querySelector(postProps.containerSelector);
      if (!container) return { error: `Container ${postProps.containerSelector} not found` };

      const imageUrl = extractValue(container as HTMLElement, postProps.imageUrlRule);
      const statisticsHtml = extractValue(shadow as any, postProps.statisticsHtmlRule);

      // Buttons
      const buttons: any[] = [];
      const btnNodes = shadow.querySelectorAll(postProps.buttonsSelector);
      btnNodes.forEach(node => {
        buttons.push({
          label: node.textContent?.trim() || '',
          url: node.getAttribute('href') || '#'
        });
      });

      // Tags
      const tags: any[] = [];
      const tagNodes = shadow.querySelectorAll(postProps.tagsSelector);
      tagNodes.forEach(node => {
        tags.push({
          name: extractValue(node as HTMLElement, postProps.tagNameRule),
          count: extractValue(node as HTMLElement, postProps.tagCountRule),
          type: extractValue(node as HTMLElement, postProps.tagTypeRule),
          url: extractValue(node as HTMLElement, postProps.tagUrlRule)
        });
      });

      return {
        layoutComponent: 'UiPostDetails',
        props: {
          imageUrl,
          statisticsHtml,
          buttons,
          tags,
          showSearch: true,
          searchSubmitUrl: new URL(targetUrl).origin + "/index.php?page=post&s=list"
        }
      };
    }
  };

  const previewData = viewMode === 'preview' ? getPreviewData() : null;

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
        
        {/* Left Panel: Target Template properties mapped */}
        <aside className="w-80 border-r border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
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

          {/* Properties mapping forms */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Properties Mapping</div>
            
            {layoutType === 'gallery' ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Container Selector</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={galleryProps.containerSelector} onChange={e => setGalleryProps({...galleryProps, containerSelector: e.target.value})} className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                    <button onClick={() => fillInspectedSelector('gallery', 'containerSelector')} className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px]">Fill</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Page Title rule</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={galleryProps.pageTitleRule} onChange={e => setGalleryProps({...galleryProps, pageTitleRule: e.target.value})} className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                    <button onClick={() => fillInspectedSelector('gallery', 'pageTitleRule')} className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px]">Fill</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Grid items selector</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={galleryProps.itemsSelector} onChange={e => setGalleryProps({...galleryProps, itemsSelector: e.target.value})} className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                    <button onClick={() => fillInspectedSelector('gallery', 'itemsSelector')} className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px]">Fill</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Item Image src rule</label>
                  <input type="text" value={galleryProps.imageUrlRule} onChange={e => setGalleryProps({...galleryProps, imageUrlRule: e.target.value})} className="w-full bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Item Link href rule</label>
                  <input type="text" value={galleryProps.linkUrlRule} onChange={e => setGalleryProps({...galleryProps, linkUrlRule: e.target.value})} className="w-full bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Pagination Selector</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={galleryProps.paginationSelector} onChange={e => setGalleryProps({...galleryProps, paginationSelector: e.target.value})} className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                    <button onClick={() => fillInspectedSelector('gallery', 'paginationSelector')} className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px]">Fill</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Container Selector</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={postProps.containerSelector} onChange={e => setPostProps({...postProps, containerSelector: e.target.value})} className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                    <button onClick={() => fillInspectedSelector('post', 'containerSelector')} className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px]">Fill</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Image src rule</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={postProps.imageUrlRule} onChange={e => setPostProps({...postProps, imageUrlRule: e.target.value})} className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                    <button onClick={() => fillInspectedSelector('post', 'imageUrlRule')} className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px]">Fill</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Statistics Html rule</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={postProps.statisticsHtmlRule} onChange={e => setPostProps({...postProps, statisticsHtmlRule: e.target.value})} className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                    <button onClick={() => fillInspectedSelector('post', 'statisticsHtmlRule')} className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px]">Fill</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Buttons Selector</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={postProps.buttonsSelector} onChange={e => setPostProps({...postProps, buttonsSelector: e.target.value})} className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                    <button onClick={() => fillInspectedSelector('post', 'buttonsSelector')} className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px]">Fill</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Tags List Selector</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={postProps.tagsSelector} onChange={e => setPostProps({...postProps, tagsSelector: e.target.value})} className="flex-1 bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white" />
                    <button onClick={() => fillInspectedSelector('post', 'tagsSelector')} className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px]">Fill</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme custom styles & vars binder */}
          <div className="border-t border-[#333333] pt-4 flex flex-col gap-3 shrink-0">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Theme Tokens</div>
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
                rows={3}
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

          <div className="flex-1 p-4 overflow-hidden flex flex-col relative">
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
                  className="flex-1 border border-[#333333] rounded overflow-auto p-6 animate-fade-in"
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
                >
                  {previewData ? (
                    'error' in previewData ? (
                      <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-xs font-sans">
                        {previewData.error}. Make sure the Container Selector maps to a valid container.
                      </div>
                    ) : (
                      (() => {
                        const Component = COMPONENT_REGISTRY[previewData.layoutComponent];
                        if (!Component) return <div className="text-xs text-zinc-500">Component {previewData.layoutComponent} registry missing.</div>;
                        return <Component {...previewData.props} />;
                      })()
                    )
                  ) : (
                    <div className="text-xs text-zinc-500 p-4">Loading preview data...</div>
                  )}
                </div>
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
