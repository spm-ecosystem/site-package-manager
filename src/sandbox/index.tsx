import { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '../content/content.css';

// Modular Imports
import { Header } from './components/Header';
import { ThemeSidebar } from './components/ThemeSidebar';
import { InspectorSidebar } from './components/InspectorSidebar';
import { makeUrlsAbsolute, computeCssSelector } from './utils';
import { runSandboxEngine } from './sandboxEngine';

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


function SandboxApp() {
  const [targetUrl, setTargetUrl] = useState<string>('https://example.com');
  const [urlInput, setUrlInput] = useState<string>('https://example.com');
  const [wsStatus, setWsStatus] = useState<string>('Disconnected');
  const [viewMode, setViewMode] = useState<'legacy' | 'preview'>('legacy');
  
  // Element Inspection States
  const [activeSelector, setActiveSelector] = useState<string>('');
  const [inspectedElement, setInspectedElement] = useState<InspectedElementData | null>(null);

  // Theme states
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

  // Default initial manifest configuration
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

  // Trigger hot reload of Modern Preview on viewMode or jsonString change
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

  // Perform Live Reconstruct rendering on the preview panel
  const triggerLivePreview = () => {
    if (!previewContainerRef.current || !rawHtmlRef.current) return;
    
    try {
      const parsedManifest = JSON.parse(jsonString);
      setJsonError(false);

      const absoluteHtml = makeUrlsAbsolute(rawHtmlRef.current, targetUrl);
      previewContainerRef.current.innerHTML = absoluteHtml;

      const matchedCount = runSandboxEngine(previewContainerRef.current, parsedManifest);

      if (matchedCount === 0) {
        const infoBar = document.createElement('div');
        infoBar.style.padding = '12px 16px';
        infoBar.style.margin = '0 0 16px 0';
        infoBar.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
        infoBar.style.border = '1px solid rgba(59, 130, 246, 0.2)';
        infoBar.style.borderRadius = '6px';
        infoBar.style.color = '#93c5fd';
        infoBar.style.fontSize = '12px';
        infoBar.style.fontFamily = 'system-ui, sans-serif';
        infoBar.style.lineHeight = '1.5';
        infoBar.innerHTML = `
          <strong>ℹ️ No elements matched your JSON selectors.</strong><br/>
          The active configuration (selectors like <code>#post-list</code> or <code>#header</code>) did not match any nodes on <code>${new URL(targetUrl).hostname}</code>. 
          Use <strong>Legacy View (Inspector)</strong> to click elements, inspect their classes, and update your JSON selectors in the editor.
        `;
        previewContainerRef.current.insertBefore(infoBar, previewContainerRef.current.firstChild);
      }
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
      {/* Top Workspace Header */}
      <Header
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        wsStatus={wsStatus}
        handleFetchTarget={handleFetchTarget}
        handleDownload={handleDownload}
      />

      {/* Main Studio Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Theme tokens settings */}
        <ThemeSidebar
          theme={theme}
          setTheme={setTheme}
        />

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

        {/* Right Panel: Element Details & Raw JSON editor */}
        <InspectorSidebar
          inspectedElement={inspectedElement}
          activeSelector={activeSelector}
          setActiveSelector={setActiveSelector}
          jsonString={jsonString}
          setJsonString={setJsonString}
          jsonError={jsonError}
          setJsonError={setJsonError}
          setTargetUrl={setTargetUrl}
          setUrlInput={setUrlInput}
          setTheme={setTheme}
          theme={theme}
        />
      </main>
    </div>
  );
}

const rootEl = document.getElementById('sandbox-root');
if (rootEl) {
  createRoot(rootEl).render(<SandboxApp />);
}
