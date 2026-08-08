import React from 'react';

interface InspectedElementData {
  tagName: string;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  text: string;
  suggestedSelectors: string[];
}

interface InspectorSidebarProps {
  inspectedElement: InspectedElementData | null;
  activeSelector: string;
  setActiveSelector: (sel: string) => void;
  jsonString: string;
  setJsonString: (val: string) => void;
  jsonError: boolean;
  setJsonError: (err: boolean) => void;
  setTargetUrl: (url: string) => void;
  setUrlInput: (url: string) => void;
  setTheme: React.Dispatch<React.SetStateAction<{
    bgPrimary: string;
    bgSecondary: string;
    accent: string;
    textPrimary: string;
    customStyles: string;
  }>>;
  // Theme states
  theme: {
    bgPrimary: string;
    bgSecondary: string;
    accent: string;
    textPrimary: string;
    customStyles: string;
  };
  onElementDrop: (data: { selector: string; tagName: string; id: string; classes: string }) => void;
  selectedComponentConfig: any | null;
  setSelectedComponentConfig: (config: any | null) => void;
}

const COMPONENT_SCHEMAS: Record<string, { props: string[]; placeholders: Record<string, string> }> = {
  UiImageCard: {
    props: ['imageUrl', 'linkUrl', 'title', 'id'],
    placeholders: {
      imageUrl: 'img | attr:src',
      linkUrl: 'a | attr:href',
      title: 'img | attr:title',
      id: 'self | attr:id'
    }
  },
  UiModernGridPage: {
    props: ['pageTitle'],
    placeholders: {
      pageTitle: 'h2 | text'
    }
  },
  UiNavHeader: {
    props: ['siteName', 'logoUrl'],
    placeholders: {
      siteName: 'h1 | text',
      logoUrl: 'img | attr:src'
    }
  },
  UiPostDetails: {
    props: ['imageUrl', 'title', 'statisticsHtml'],
    placeholders: {
      imageUrl: 'img | attr:src',
      title: 'h2 | text',
      statisticsHtml: '.sidebar | html'
    }
  },
  UiTagBadge: {
    props: ['label', 'url', 'count', 'type'],
    placeholders: {
      label: 'a | text',
      url: 'a | attr:href',
      count: '.count | text',
      type: 'value:primary'
    }
  },
  UiSearchBar: {
    props: ['placeholder', 'actionUrl', 'queryParamName'],
    placeholders: {
      placeholder: 'input | attr:placeholder',
      actionUrl: 'form | attr:action',
      queryParamName: 'input | attr:name'
    }
  },
  UiPaginationBar: {
    props: ['currentPage', 'totalPages', 'prevUrl', 'nextUrl'],
    placeholders: {
      currentPage: '.current | text',
      totalPages: '.total | text',
      prevUrl: 'a.prev | attr:href',
      nextUrl: 'a.next | attr:href'
    }
  },
  UiText: {
    props: ['value'],
    placeholders: {
      value: 'self | text'
    }
  },
  UiImage: {
    props: ['src', 'alt', 'title'],
    placeholders: {
      src: 'self | attr:src',
      alt: 'self | attr:alt',
      title: 'self | attr:title'
    }
  },
  UiLink: {
    props: ['href', 'text'],
    placeholders: {
      href: 'self | attr:href',
      text: 'self | text'
    }
  }
};

export const InspectorSidebar: React.FC<InspectorSidebarProps> = ({
  inspectedElement,
  activeSelector,
  setActiveSelector,
  jsonString,
  setJsonString,
  jsonError,
  setJsonError,
  setTargetUrl,
  setUrlInput,
  setTheme,
  theme,
  onElementDrop,
  selectedComponentConfig,
  setSelectedComponentConfig
}) => {
  // Resolve component schema props merged with active custom properties
  const componentSchema = selectedComponentConfig ? COMPONENT_SCHEMAS[selectedComponentConfig.name] : null;
  const allPropsKeys = selectedComponentConfig
    ? Array.from(new Set([
        ...(componentSchema?.props || []),
        ...Object.keys(selectedComponentConfig.config.propsMap || {})
      ]))
    : [];

  return (
    <aside className="w-80 border-r border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
      
      {/* Component Editor Panel (Active Component Selected) */}
      {selectedComponentConfig ? (
        <div className="border-b border-[#333333] pb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <span className="text-purple-400">✨</span> Component Settings
            </div>
            <button 
              onClick={() => setSelectedComponentConfig(null)}
              className="text-[10px] text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded transition"
            >
              Close ✕
            </button>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded p-3 flex flex-col gap-2 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Component:</span>
              <span className="text-purple-400 font-bold">{selectedComponentConfig.name}</span>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-zinc-500">Selector:</span>
              <span className="text-zinc-300 break-all bg-black/50 p-1 border border-zinc-900 rounded">{selectedComponentConfig.selector}</span>
            </div>
          </div>

          {/* Properties Form (propsMap) */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Props Mapping</div>
            
            {allPropsKeys.length === 0 ? (
              <div className="text-[10px] text-zinc-500 italic">No customizable properties in map.</div>
            ) : (
              allPropsKeys.map((propName) => {
                const rule = selectedComponentConfig.config.propsMap?.[propName] || '';
                const placeholder = componentSchema?.placeholders?.[propName] || 'self | text';
                return (
                  <div key={propName} className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-300 font-semibold">{propName}</label>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(jsonString);
                          const list = selectedComponentConfig.type === 'reconstruct' ? parsed.reconstructs : parsed.components;
                          const matching = list.find((c: any) => 
                            (c.selector === selectedComponentConfig.selector || c.containerSelector === selectedComponentConfig.selector)
                          );
                          if (matching) {
                            matching.propsMap = matching.propsMap || {};
                            const val = e.target.value;
                            if (val.trim() === '') {
                              delete matching.propsMap[propName];
                            } else {
                              matching.propsMap[propName] = val;
                            }
                            setJsonString(JSON.stringify(parsed, null, 2));
                            
                            // Sync local sidebar state to maintain cursor focus
                            setSelectedComponentConfig({
                              ...selectedComponentConfig,
                              config: matching
                            });
                          }
                        } catch (err) {}
                      }}
                      className="w-full bg-black border border-zinc-800 focus:border-purple-500 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none transition"
                      placeholder={placeholder}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Delete Component Button */}
          <div className="pt-2 border-t border-zinc-900 mt-2">
            <button
              onClick={() => {
                try {
                  const parsed = JSON.parse(jsonString);
                  if (selectedComponentConfig.type === 'reconstruct') {
                    parsed.reconstructs = parsed.reconstructs.filter((c: any) => c.containerSelector !== selectedComponentConfig.selector);
                  } else {
                    parsed.components = parsed.components.filter((c: any) => c.selector !== selectedComponentConfig.selector);
                  }
                  setJsonString(JSON.stringify(parsed, null, 2));
                  setSelectedComponentConfig(null);
                } catch (e) {}
              }}
              className="w-full py-1.5 rounded text-[10px] font-bold bg-red-950/20 hover:bg-red-900 border border-red-900/30 hover:border-red-600 text-red-300 transition"
            >
              🗑️ Delete Component Configuration
            </button>
          </div>
        </div>
      ) : inspectedElement ? (
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

            {/* Captured Attributes list */}
            {Object.keys(inspectedElement.attributes || {}).length > 0 && (
              <div className="mt-1.5">
                <span className="text-[11px] font-semibold text-zinc-400 block mb-1">Captured Attributes</span>
                <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                  {Object.entries(inspectedElement.attributes).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between font-mono text-[9px] bg-black/40 border border-zinc-900 rounded p-1">
                      <span className="text-zinc-500 font-semibold">{key}:</span>
                      <span className="text-emerald-400 truncate max-w-[140px]" title={val}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic extraction parser helper box */}
            <div className="mt-2.5 bg-[#1a1a1a] border border-zinc-800 rounded p-2.5 text-[9px] text-zinc-400 leading-snug flex flex-col gap-1.5">
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                <span>💡</span> Extraction Mapping Guide:
              </span>
              <div className="text-[9px]">
                To extract text from this node: <code className="text-purple-400 font-mono font-semibold">self | text</code>
              </div>
              {inspectedElement.attributes.src && (
                <div className="text-[9px]">
                  To extract image source: <code className="text-purple-400 font-mono font-semibold">img | attr:src</code>
                </div>
              )}
              {inspectedElement.attributes.href && (
                <div className="text-[9px]">
                  To extract link address: <code className="text-purple-400 font-mono font-semibold">a | attr:href</code>
                </div>
              )}
              {inspectedElement.attributes.alt && (
                <div className="text-[9px]">
                  To extract alt text: <code className="text-purple-400 font-mono font-semibold">img | attr:alt</code>
                </div>
              )}
            </div>

            {/* Auxiliary Drag Handle & Quick Actions */}
            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-zinc-800/80">
              <div 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', activeSelector);
                  e.dataTransfer.setData('spm/element-tag', inspectedElement.tagName);
                  e.dataTransfer.setData('spm/element-id', inspectedElement.id || '');
                  e.dataTransfer.setData('spm/element-classes', inspectedElement.classes.join(' '));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="border border-purple-500/20 hover:border-purple-500/40 rounded bg-purple-500/5 hover:bg-purple-500/10 p-2.5 text-center cursor-grab transition flex items-center justify-center gap-2 group shrink-0"
                title="Drag this handle to the builder zone on the left"
              >
                <span className="text-purple-400 group-hover:scale-110 transition text-xs">🫳</span>
                <span className="text-[10px] font-semibold text-zinc-300 group-hover:text-white">Drag Handle (Drag to Builder)</span>
              </div>

              <button
                onClick={() => {
                  onElementDrop({
                    selector: activeSelector,
                    tagName: inspectedElement.tagName,
                    id: inspectedElement.id || '',
                    classes: inspectedElement.classes.join(' ')
                  });
                }}
                className="w-full py-1.5 rounded text-[10px] font-semibold bg-purple-500 hover:bg-purple-600 text-white shadow shadow-purple-500/10 transition"
              >
                Transform Element...
              </button>
            </div>
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

              if (parsed.targetUrl) {
                const clean = parsed.targetUrl.replace(/\/\*$/, '');
                setTargetUrl(clean);
                setUrlInput(clean);
              }

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
  );
};
