import { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './sandbox.css';

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

interface CaptureDomResponse {
  ok: boolean;
  html?: string;
  url?: string;
  error?: string;
}

const CAPTURE_TIMEOUT_MS = 7000;
const FETCH_TIMEOUT_MS = 10000;


function SandboxApp() {
  const savedTargetUrl = localStorage.getItem('spm_sandbox_target_url') || 'https://example.com';
  const savedViewMode = (localStorage.getItem('spm_sandbox_view_mode') as 'legacy' | 'preview') || 'legacy';
  const savedTheme = JSON.parse(localStorage.getItem('spm_sandbox_theme') || 'null') || {
    bgPrimary: '#000000',
    bgSecondary: '#111111',
    accent: '#ffffff',
    textPrimary: '#ffffff',
    customStyles: '/* Add your CSS overrides here */\n.sidebar { padding: 0 !important; }'
  };

  const safeTargetOrigin = () => {
    try {
      return new URL(targetUrl).origin;
    } catch {
      return 'https://example.com';
    }
  };

  const safeTargetHostname = () => {
    try {
      return new URL(targetUrl).hostname;
    } catch {
      return 'example.com';
    }
  };
  const savedJsonString = localStorage.getItem('spm_sandbox_json_string') || '';

  const savedRawHtml = localStorage.getItem('spm_sandbox_raw_html') || '';

  const [targetUrl, setTargetUrl] = useState<string>(savedTargetUrl);
  const [urlInput, setUrlInput] = useState<string>(savedTargetUrl);
  const [wsStatus, setWsStatus] = useState<string>('Disconnected');
  const [viewMode, setViewMode] = useState<'legacy' | 'preview'>(savedViewMode);
  
  // Element Inspection States
  const [activeSelector, setActiveSelector] = useState<string>('');
  const [inspectedElement, setInspectedElement] = useState<InspectedElementData | null>(null);

  const [theme, setTheme] = useState<CustomTheme>(savedTheme);
  const [jsonString, setJsonString] = useState<string>(savedJsonString);
  const [jsonError, setJsonError] = useState<boolean>(false);
  const [rawHtml, setRawHtml] = useState<string>(savedRawHtml);
  const [captureStatus, setCaptureStatus] = useState<string>('Idle');
  const [selectedComponentConfig, setSelectedComponentConfig] = useState<any | null>(null);

  // Drag & Drop Modal states
  const [dropModalOpen, setDropModalOpen] = useState<boolean>(false);
  const [draggedElementInfo, setDraggedElementInfo] = useState<{
    selector: string;
    tagName: string;
    id: string;
    classes: string;
  } | null>(null);
  const [selectedMappingComponent, setSelectedMappingComponent] = useState<string>('UiImageCard');

  const legacyExplorerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Persist workspace state on refresh/reload
  useEffect(() => {
    localStorage.setItem('spm_sandbox_target_url', targetUrl);
    localStorage.setItem('spm_sandbox_view_mode', viewMode);
    localStorage.setItem('spm_sandbox_theme', JSON.stringify(theme));
    if (jsonString) {
      localStorage.setItem('spm_sandbox_json_string', jsonString);
    }
  }, [targetUrl, viewMode, theme, jsonString]);

  // Default initial manifest configuration (pure blueprint layout)
  const defaultManifest = {
    targetUrl: safeTargetOrigin() + "/*",
    version: "1.0.0",
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
    components: [],
    reconstructs: []
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
      parsed.targetUrl = safeTargetOrigin() + "/*";
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

  // Connect visual editor callbacks to the preview container host
  useEffect(() => {
    if (!previewContainerRef.current) return;

    const host = previewContainerRef.current as any;

    host.__deleteComponent = (selector: string, type: 'component' | 'reconstruct') => {
      try {
        const parsed = JSON.parse(jsonString);
        if (type === 'reconstruct') {
          parsed.reconstructs = parsed.reconstructs.filter((c: any) => c.containerSelector !== selector);
        } else {
          parsed.components = parsed.components.filter((c: any) => c.selector !== selector);
        }
        setJsonString(JSON.stringify(parsed, null, 2));
        setSelectedComponentConfig(null);
      } catch (e) {
        console.error('[SPM Sandbox] Error deleting component:', e);
      }
    };

    host.__updateComponentWidth = (selector: string, type: 'component' | 'reconstruct', width: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        const list = type === 'reconstruct' ? parsed.reconstructs : parsed.components;
        const matching = list.find((c: any) => (c.selector === selector || c.containerSelector === selector));
        if (matching) {
          matching.style = matching.style || {};
          matching.style.width = width;
          setJsonString(JSON.stringify(parsed, null, 2));
        }
      } catch (e) {
        console.error('[SPM Sandbox] Error updating component width:', e);
      }
    };

    host.__selectComponent = (selector: string, type: 'component' | 'reconstruct') => {
      try {
        const parsed = JSON.parse(jsonString);
        const list = type === 'reconstruct' ? parsed.reconstructs : parsed.components;
        const matching = list.find((c: any) => (c.selector === selector || c.containerSelector === selector));
        if (matching) {
          setSelectedComponentConfig({
            selector,
            type,
            name: type === 'reconstruct' ? matching.layoutComponent : matching.name,
            config: matching
          });
        }
      } catch (e) {}
    };
  }, [jsonString]);

  // Refetch target URL when it changes
  useEffect(() => {
    fetchHtmlDump();
    connectWebSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [targetUrl]);

  // Render rawHtml inside Legacy DOM Explorer whenever it updates
  useEffect(() => {
    if (!rawHtml || !legacyExplorerRef.current) return;

    const shadow = legacyExplorerRef.current.shadowRoot || legacyExplorerRef.current.attachShadow({ mode: 'open' });
    const absoluteHtml = makeUrlsAbsolute(rawHtml, targetUrl);

    const baseTag = `<base href="${safeTargetOrigin()}">`;
    shadow.innerHTML = `
      ${baseTag}
      <style>
        .spm-selected-element {
          outline: 2.5px solid #16a34a !important;
          outline-offset: -2.5px !important;
          box-shadow: 0 0 12px rgba(22, 163, 74, 0.25) !important;
          background-color: rgba(22, 163, 74, 0.06) !important;
        }
      </style>
      <div class="sandbox-fetched-content" style="width:100%; height:100%; overflow:auto;">
        ${absoluteHtml}
      </div>
    `;

    // Make all fetched elements draggable
    shadow.querySelectorAll('.sandbox-fetched-content *').forEach((el: any) => {
      el.setAttribute('draggable', 'true');
    });

    // Package selector path on dragstart event
    shadow.addEventListener('dragstart', (e: any) => {
      const target = e.target as HTMLElement;
      if (!target || target === shadow.host) return;

      const selector = computeCssSelector(target);
      e.dataTransfer?.setData('text/plain', selector);
      e.dataTransfer?.setData('spm/element-tag', target.tagName.toLowerCase());
      e.dataTransfer?.setData('spm/element-id', target.id || '');
      e.dataTransfer?.setData('spm/element-classes', Array.from(target.classList).filter(c => c !== 'spm-selected-element').join(' '));
      e.dataTransfer!.effectAllowed = 'copy';
    });

    shadow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      if (!target || target === shadow.host) return;

      const selector = computeCssSelector(target);
      setActiveSelector(selector);

      const tagName = target.tagName.toLowerCase();
      const id = target.id || '';
      const classes = Array.from(target.classList).filter(c => c !== 'spm-selected-element');
      const text = target.textContent?.trim().slice(0, 100) || '';
      
      const attributes: Record<string, string> = {};
      for (let i = 0; i < target.attributes.length; i++) {
        const attr = target.attributes[i];
        if (attr.name !== 'class' && attr.name !== 'spm-selected-element') {
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
  }, [rawHtml, targetUrl]);

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

  const stripScripts = (htmlText: string) => {
    return htmlText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    let timeoutId: number | undefined;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  const fetchTextWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const captureTabWithScripting = async (tabId: number): Promise<CaptureDomResponse | null> => {
    if (typeof chrome === 'undefined' || !chrome.scripting) return null;

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        const waitForDomToSettle = (timeoutMs = 4000, idleMs = 700) => {
          return new Promise<void>((resolve) => {
            if (!document.body) {
              resolve();
              return;
            }

            let lastMutation = Date.now();
            const startedAt = Date.now();
            const observer = new MutationObserver(() => {
              lastMutation = Date.now();
            });

            observer.observe(document.documentElement, {
              attributes: true,
              childList: true,
              subtree: true,
              characterData: true
            });

            const interval = window.setInterval(() => {
              const now = Date.now();
              const isIdle = now - lastMutation >= idleMs;
              const timedOut = now - startedAt >= timeoutMs;

              if (isIdle || timedOut) {
                window.clearInterval(interval);
                observer.disconnect();
                resolve();
              }
            }, 150);
          });
        };

        if (document.readyState === 'loading') {
          await new Promise<void>((resolve) => {
            document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
          });
        }

        await waitForDomToSettle();

        const clone = document.documentElement.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, #spm-global-theme-styles, #spm-global-toast-host').forEach((el) => el.remove());
        clone.querySelectorAll('[data-spm-id]').forEach((el) => el.removeAttribute('data-spm-id'));

        const doctype = document.doctype
          ? `<!DOCTYPE ${document.doctype.name}>`
          : '<!DOCTYPE html>';

        return {
          ok: true,
          html: `${doctype}\n${clone.outerHTML}`,
          url: window.location.href
        };
      }
    });

    return (results[0]?.result as CaptureDomResponse | undefined) || null;
  };

  const tabMatchScore = (tabUrl: string | undefined, desiredUrl: string) => {
    if (!tabUrl) return 0;

    try {
      const tab = new URL(tabUrl);
      const desired = new URL(desiredUrl);

      if (tab.href === desired.href) return 4;
      if (tab.origin === desired.origin && tab.pathname === desired.pathname && tab.hash === desired.hash) return 3;
      if (tab.origin === desired.origin && tab.pathname === desired.pathname) return 2;
      if (tab.hostname === desired.hostname) return 1;
    } catch {
      return 0;
    }

    return 0;
  };

  const captureOpenTabHtml = async (): Promise<string | null> => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return null;

    setCaptureStatus('Looking for a matching open tab...');
    const tabs = await chrome.tabs.query({});
    const matchingTabs = tabs
      .map((tab) => ({ tab, score: tabMatchScore(tab.url, targetUrl) }))
      .filter(({ tab, score }) => Boolean(tab.id) && score > 0)
      .sort((a, b) => b.score - a.score);

    if (matchingTabs.length === 0) {
      setCaptureStatus('No matching open tab found. Trying HTML fetch...');
      return null;
    }

    for (const { tab } of matchingTabs) {
      if (!tab.id) continue;

      try {
        setCaptureStatus(`Capturing rendered DOM from ${tab.url || 'open tab'}...`);
        const response = await withTimeout(
          chrome.tabs.sendMessage(tab.id, { type: 'SPM_SANDBOX_CAPTURE_DOM' }) as Promise<CaptureDomResponse>,
          CAPTURE_TIMEOUT_MS,
          'Rendered tab capture'
        );

        if (response?.ok && response.html) {
          if (response.url && response.url !== targetUrl) {
            setUrlInput(response.url);
            setTargetUrl(response.url);
          }

          console.log('[SPM Sandbox] Captured rendered DOM from open tab:', response.url || tab.url);
          setCaptureStatus(`Captured rendered DOM from ${response.url || tab.url}`);
          return response.html;
        }

        if (response?.error) {
          console.warn('[SPM Sandbox] Tab capture responded with error:', response.error);
        }
      } catch (err) {
        console.warn('[SPM Sandbox] Could not capture DOM from tab:', tab.url, err);
      }

      try {
        setCaptureStatus(`Injecting DOM capture into ${tab.url || 'open tab'}...`);
        const response = await withTimeout(
          captureTabWithScripting(tab.id),
          CAPTURE_TIMEOUT_MS,
          'Injected rendered tab capture'
        );

        if (response?.ok && response.html) {
          if (response.url && response.url !== targetUrl) {
            setUrlInput(response.url);
            setTargetUrl(response.url);
          }

          console.log('[SPM Sandbox] Captured rendered DOM by script injection:', response.url || tab.url);
          setCaptureStatus(`Captured rendered DOM from ${response.url || tab.url}`);
          return response.html;
        }
      } catch (err) {
        console.warn('[SPM Sandbox] Could not inject DOM capture into tab:', tab.url, err);
      }
    }

    return null;
  };

  const fetchHtmlDump = async () => {
    let htmlText = '';
    let fetched = false;
    setCaptureStatus('Starting capture...');

    // 1. Prefer an already-rendered open tab. This handles SPA pages whose DOM is
    // created after JavaScript runs, including authenticated screens.
    try {
      const capturedHtml = await captureOpenTabHtml();
      if (capturedHtml) {
        htmlText = capturedHtml;
        fetched = true;
      }
    } catch (captureErr) {
      console.warn('[SPM Sandbox] Rendered tab capture failed. Retrying via fetch...', captureErr);
    }

    // 2. Direct browser context fetch
    try {
      if (!fetched) {
        setCaptureStatus('No rendered DOM captured. Trying direct HTML fetch...');
        const response = await fetchTextWithTimeout(targetUrl, FETCH_TIMEOUT_MS);
        if (response.ok) {
          htmlText = await response.text();
          fetched = true;
          setCaptureStatus('Loaded HTML via direct fetch.');
        }
      }
    } catch (directErr) {
      console.warn('[SPM Sandbox] Direct browser fetch failed. Retrying via local proxy...', directErr);
    }

    // 3. Local CORS bypass proxy fetch fallback
    if (!fetched) {
      try {
        setCaptureStatus('Trying local proxy HTML fetch...');
        const proxyUrl = `http://localhost:8080/fetch?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetchTextWithTimeout(proxyUrl, FETCH_TIMEOUT_MS);
        if (response.ok) {
          htmlText = await response.text();
          fetched = true;
          setCaptureStatus('Loaded HTML via local proxy.');
        } else {
          throw new Error(`Proxy returned status ${response.status}`);
        }
      } catch (proxyErr) {
        console.error('[SPM Sandbox] Local proxy fetch failed too:', proxyErr);
      }
    }

    if (fetched) {
      // Clear scripts
      htmlText = stripScripts(htmlText);
      localStorage.setItem('spm_sandbox_raw_html', htmlText);
      setRawHtml(htmlText);
    } else {
      setCaptureStatus('Capture failed. Open or reload the target page tab, then click Capture again.');
      setRawHtml(`
        <div style="padding: 24px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; font-family: system-ui, sans-serif; margin: 16px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">Unable to capture target page</h4>
          <p style="margin: 0; font-size: 12px; line-height: 1.5;">
            Could not capture rendered DOM or fetch HTML for <code>${targetUrl}</code>. Open the page in a normal tab, reload that tab after updating the extension, wait for the site content to appear, then click <strong>Capture</strong> again.
          </p>
        </div>
      `);
    }
  };

  // Reactively highlight all elements matching the active selector in Legacy View
  useEffect(() => {
    const shadow = legacyExplorerRef.current?.shadowRoot;
    if (!shadow) return;

    // 1. Clear previous selections
    shadow.querySelectorAll('.spm-selected-element').forEach(el => {
      el.classList.remove('spm-selected-element');
    });

    if (!activeSelector) return;

    // 2. Query and highlight all matching nodes
    try {
      const elements = shadow.querySelectorAll(activeSelector);
      elements.forEach(el => {
        el.classList.add('spm-selected-element');
      });
    } catch (e) {
      // Ignore invalid query selector exceptions during user typing
    }
  }, [activeSelector, targetUrl]);

  // Trigger hot reload of Modern Preview on viewMode, rawHtml, or jsonString change
  useEffect(() => {
    if (viewMode === 'preview') {
      triggerLivePreview();
    }
  }, [viewMode, jsonString, rawHtml]);

  // Perform Live Reconstruct rendering on the preview panel
  const triggerLivePreview = () => {
    if (!previewContainerRef.current || !rawHtml) return;
    
    try {
      const parsedManifest = JSON.parse(jsonString);
      setJsonError(false);

      const shadow = previewContainerRef.current.shadowRoot || previewContainerRef.current.attachShadow({ mode: 'open' });

      const absoluteHtml = makeUrlsAbsolute(rawHtml, targetUrl);
      shadow.innerHTML = `
        <div id="spm-preview-root" style="width: 100%; height: 100%; overflow: auto; padding: 24px; box-sizing: border-box;">
          ${absoluteHtml}
        </div>
      `;

      const previewRoot = shadow.getElementById('spm-preview-root');
      if (previewRoot) {
        const matchedCount = runSandboxEngine(previewRoot, parsedManifest);

        if (matchedCount === 0) {
          const infoBar = document.createElement('div');
          infoBar.style.padding = '12px 16px';
          infoBar.style.margin = '0 0 16px 0';
          infoBar.style.backgroundColor = 'rgba(22, 163, 74, 0.06)';
          infoBar.style.border = '1px solid rgba(22, 163, 74, 0.18)';
          infoBar.style.borderRadius = '6px';
          infoBar.style.color = '#e7e7e7';
          infoBar.style.fontSize = '12px';
          infoBar.style.fontFamily = 'system-ui, sans-serif';
          infoBar.style.lineHeight = '1.5';
          infoBar.innerHTML = `
            <strong>No elements matched your JSON selectors.</strong><br/>
            The active configuration (selectors like <code>#post-list</code> or <code>#header</code>) did not match any nodes on <code>${safeTargetHostname()}</code>. 
            Use <strong>Legacy View (Inspector)</strong> to click elements, inspect their classes, and update your JSON selectors in the editor.
          `;
          previewRoot.insertBefore(infoBar, previewRoot.firstChild);
        }
      }
    } catch (err) {
      console.warn('[SPM Sandbox] Error rendering Live Preview:', err);
      setJsonError(true);
      const shadow = previewContainerRef.current.shadowRoot || previewContainerRef.current.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div style="padding: 24px; color: #f8f8f8; background-color: #111111; border: 1px solid #333333; border-radius: 4px; font-family: system-ui, sans-serif; margin: 16px;">
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
      if (urlInput === targetUrl) {
        fetchHtmlDump();
      } else {
        setTargetUrl(urlInput);
      }
    }
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${safeTargetHostname()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleElementDrop = (data: { selector: string; tagName: string; id: string; classes: string }) => {
    setDraggedElementInfo(data);
    
    // Auto-detect best match default component based on tags
    if (data.tagName === 'img') {
      setSelectedMappingComponent('UiImageCard');
    } else if (data.tagName === 'header' || data.id === 'header') {
      setSelectedMappingComponent('UiNavHeader');
    } else if (data.tagName === 'form' || data.tagName === 'input') {
      setSelectedMappingComponent('UiSearchBar');
    } else {
      setSelectedMappingComponent('UiModernGridPage');
    }

    setDropModalOpen(true);
  };

  const executeTransformation = () => {
    if (!draggedElementInfo) return;
    try {
      const parsed = JSON.parse(jsonString);
      
      const compName = selectedMappingComponent;
      const selector = draggedElementInfo.selector;

      // 1. Pages layouts (reconstructs) vs standard elements (components)
      if (compName === 'UiModernGridPage') {
        parsed.reconstructs.push({
          containerSelector: selector,
          layoutComponent: "UiModernGridPage",
          propsMap: {
            pageTitle: "h2 | text"
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
        });
      } else if (compName === 'UiPostDetails') {
        parsed.reconstructs.push({
          containerSelector: selector,
          layoutComponent: "UiPostDetails",
          propsMap: {
            imageUrl: "img | attr:src",
            statisticsHtml: ".sidebar | html"
          },
          children: [
            {
              name: "buttons",
              selector: "a",
              propsMap: {
                label: "self | text",
                url: "self | attr:href"
              }
            }
          ]
        });
      } else if (compName === 'UiNavHeader') {
        parsed.components.push({
          name: "UiNavHeader",
          selector: selector,
          action: "replace",
          propsMap: {
            siteName: "a | text"
          },
          children: [
            {
              name: "primaryLinks",
              selector: "a",
              scope: "document",
              propsMap: {
                label: "self | text",
                url: "self | attr:href"
              }
            }
          ]
        });
      } else {
        // Fallback for simple elements
        parsed.components.push({
          name: compName,
          selector: selector,
          action: "replace",
          propsMap: {
            value: "self | text"
          }
        });
      }

      setJsonString(JSON.stringify(parsed, null, 2));
      setDropModalOpen(false);
      setDraggedElementInfo(null);
    } catch (e) {
      alert('Could not update JSON. Make sure config JSON contains valid syntax.');
    }
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
          onElementDrop={handleElementDrop}
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
            {/* Legacy View Panel */}
            <div className={`flex-1 flex flex-col overflow-hidden ${viewMode === 'legacy' ? 'block' : 'hidden'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="text-xs font-bold text-zinc-500 uppercase shrink-0">Legacy DOM Explorer</div>
                  <div className="text-[11px] text-zinc-500 truncate">{captureStatus}</div>
                </div>
                {activeSelector && (
                  <div className="text-[11px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-white truncate max-w-[400px]">
                    Inspecting: {activeSelector}
                  </div>
                )}
              </div>
              <div className="flex-1 bg-white border border-[#333333] rounded overflow-auto" ref={legacyExplorerRef}></div>
            </div>

            {/* Modern Preview Panel */}
            <div className={`flex-1 flex flex-col overflow-hidden ${viewMode === 'preview' ? 'block' : 'hidden'}`}>
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
          onElementDrop={handleElementDrop}
          selectedComponentConfig={selectedComponentConfig}
          setSelectedComponentConfig={setSelectedComponentConfig}
        />
      </main>

      {/* Drag & Drop Convert Component Modal */}
      {dropModalOpen && draggedElementInfo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#111111] border border-[#333333] rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Convert Element into Component
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                Map target DOM node to a SPM React component. We will append this to your JSON manifest configuration.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded p-3 flex flex-col gap-2 font-mono text-[10px] text-zinc-400">
              <div className="flex justify-between">
                <span>Tag:</span>
                <span className="text-[#16a34a] font-semibold">{draggedElementInfo.tagName}</span>
              </div>
              <div className="flex justify-between">
                <span>Selector:</span>
                <span className="text-white truncate max-w-[280px]">{draggedElementInfo.selector}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Choose React Component</label>
              <select
                value={selectedMappingComponent}
                onChange={(e) => setSelectedMappingComponent(e.target.value)}
                className="w-full bg-black border border-[#333333] hover:border-zinc-600 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#16a34a] transition"
              >
                <option value="UiImageCard">UiImageCard (Single card element)</option>
                <option value="UiModernGridPage">UiModernGridPage (Gallery Layout page)</option>
                <option value="UiPostDetails">UiPostDetails (Image/Post details page)</option>
                <option value="UiNavHeader">UiNavHeader (Navigation header)</option>
                <option value="UiSearchBar">UiSearchBar (Search input)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-800/80 pt-4 mt-2">
              <button
                onClick={() => {
                  setDropModalOpen(false);
                  setDraggedElementInfo(null);
                }}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-[#222222] hover:bg-zinc-800 text-zinc-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeTransformation}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-[#16a34a] text-white hover:bg-[#115e33] shadow-md shadow-black/20 transition"
              >
                Transform Element
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const rootEl = document.getElementById('sandbox-root');
if (rootEl) {
  createRoot(rootEl).render(<SandboxApp />);
}
