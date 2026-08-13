import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../content/content.css';

const WORKER_ORIGIN = 'https://spm.hexacloud.net.br';



export interface ThemeVariable {
  key: string;
  label: string;
  type: 'color' | 'text';
}

const THEME_VARIABLE_META: ThemeVariable[] = [
  { key: '--spm-bg-primary',   label: 'Background',      type: 'color' },
  { key: '--spm-bg-secondary', label: 'Surface',         type: 'color' },
  { key: '--spm-bg-tertiary',  label: 'Elevated',        type: 'color' },
  { key: '--spm-text-primary', label: 'Text',            type: 'color' },
  { key: '--spm-text-muted',   label: 'Text Muted',      type: 'color' },
  { key: '--spm-accent',       label: 'Accent',          type: 'color' },
  { key: '--spm-accent-fg',    label: 'Accent Text',     type: 'color' },
  { key: '--spm-border',       label: 'Border',          type: 'color' },
];

function Popup() {
  const [globalEnabled, setGlobalEnabled]   = useState<boolean>(true);
  const [currentDomain, setCurrentDomain]   = useState<string>('');
  const [activeTabId, setActiveTabId]       = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab]           = useState<'theme' | 'colors'>('theme');
  const [themeVars, setThemeVars]           = useState<Record<string, string>>({});
  const [defaultThemeVars, setDefaultThemeVars] = useState<Record<string, string>>({});


  // Reconstructed registry and preferences
  const [registry, setRegistry] = useState<Record<string, any>>({});
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [spmActivePackages, setSpmActivePackages] = useState<Record<string, string>>({});
  const [spmPinnedVersions, setSpmPinnedVersions] = useState<Record<string, Record<string, string>>>({});
  const [spmDevModeHosts, setSpmDevModeHosts] = useState<Record<string, boolean>>({});
  const [devDraftManifestRaw, setDevDraftManifestRaw] = useState<string>('');
  const [devDraftCssRaw, setDevDraftCssRaw] = useState<string>('');
  const [manifestPathInput, setManifestPathInput] = useState('');
  


  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (tab?.id) setActiveTabId(tab.id);
        if (tab?.url) {
          try {
            const domain = new URL(tab.url).hostname;
            setCurrentDomain(domain);
            
            // 1. Fetch available themes from R2 Worker
            let reconstructedRegistry: Record<string, any> = {};
            try {
              const workerRes = await fetch(`${WORKER_ORIGIN}/spm/v1/api/themes/${domain}`);
              if (workerRes.ok) {
                const data = await workerRes.json();
                if (data && data.themes && Array.isArray(data.themes) && data.themes.length > 0) {
                  const packagesMap: Record<string, any> = {};
                  let firstThemeName = '';

                  for (const item of data.themes) {
                    const parts = (item.key || '').split('/');
                    const themeName = parts.length >= 3 ? parts[2] : (item.key || 'default');
                    if (!firstThemeName) firstThemeName = themeName;

                    const tagsArray = item.tags
                      ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                      : [];

                    if (!packagesMap[themeName]) {
                      packagesMap[themeName] = {
                        displayName: item.label || themeName,
                        activeVersion: item.version,
                        directory: themeName,
                        history: [],
                        tags: tagsArray
                      };
                    }
                    packagesMap[themeName].activeVersion = item.version;
                    if (item.label) packagesMap[themeName].displayName = item.label;

                    let formattedDate = 'R2';
                    if (item.timestamp) {
                      try {
                        formattedDate = new Date(item.timestamp).toISOString().split('T')[0];
                      } catch {
                        formattedDate = String(item.timestamp);
                      }
                    }

                    packagesMap[themeName].history.push({
                      version: item.version,
                      ref: 'R2',
                      date: formattedDate
                    });
                  }

                  if (firstThemeName) {
                    reconstructedRegistry = {
                      [domain]: {
                        defaultPackage: firstThemeName,
                        packages: packagesMap
                      }
                    };
                  }
                }
              }
            } catch (err) {
              console.error('[SPM Popup] Error fetching themes from R2 Worker:', err);
            }

            setRegistry(reconstructedRegistry);

            // 2. Read storage preferences
            const storageKeys = [
              'spm_global_enabled',
              'spm_active_packages',
              'spm_pinned_versions',
              'spm_dev_mode_hosts',
              'spm_dev_mode',
              `dev-draft-manifest:${domain}`,
              `dev-draft-css:${domain}`,
              `spm_pinned_package:${domain}`,
              `spm_pinned_version:${domain}`,
              'spm_theme_overrides'
            ];

            chrome.storage.local.get(storageKeys, (res) => {
              if (res.spm_global_enabled !== undefined) setGlobalEnabled(res.spm_global_enabled);
              
              const activePkgs = res.spm_active_packages || {};
              if (res[`spm_pinned_package:${domain}`] && !activePkgs[domain]) {
                activePkgs[domain] = res[`spm_pinned_package:${domain}`];
              }
              setSpmActivePackages(activePkgs);

              const pinnedVers = res.spm_pinned_versions || {};
              if (res[`spm_pinned_version:${domain}`]) {
                const pkg = activePkgs[domain] || reconstructedRegistry[domain]?.defaultPackage || '';
                if (pkg) {
                  if (!pinnedVers[domain]) pinnedVers[domain] = {};
                  if (!pinnedVers[domain][pkg]) {
                    pinnedVers[domain][pkg] = res[`spm_pinned_version:${domain}`];
                  }
                }
              }
              setSpmPinnedVersions(pinnedVers);

              const devHosts = res.spm_dev_mode_hosts || {};
              if (res.spm_dev_mode && typeof res.spm_dev_mode === 'object') {
                Object.assign(devHosts, res.spm_dev_mode);
              } else if (res.spm_dev_mode === true) {
                devHosts[domain] = true;
              }
              setSpmDevModeHosts(devHosts);

              setDevDraftManifestRaw(res[`dev-draft-manifest:${domain}`] || '');
              setDevDraftCssRaw(res[`dev-draft-css:${domain}`] || '');

              const overrides = res.spm_theme_overrides?.[domain] || {};
              setThemeVars(overrides);
            });
          } catch (err) {
            console.error('[SPM Popup] Error querying active tab info:', err);
            setCurrentDomain('');
          }
        }
      });
    }
  }, []);

  const reloadTab = () => {
    if (typeof chrome !== 'undefined' && activeTabId !== undefined) {
      chrome.tabs.reload(activeTabId);
    }
  };

  const toggleGlobal = () => {
    const next = !globalEnabled;
    setGlobalEnabled(next);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ spm_global_enabled: next }, reloadTab);
    }
  };

  const handlePackageChange = (newPkgId: string) => {
    const nextActivePkgs = { ...spmActivePackages, [currentDomain]: newPkgId };
    setSpmActivePackages(nextActivePkgs);

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        spm_active_packages: nextActivePkgs,
        [`spm_pinned_package:${currentDomain}`]: newPkgId
      }, reloadTab);
    }
  };

  const handleVersionChange = (newVersion: string) => {
    const currentPkg = spmActivePackages[currentDomain] || registry[currentDomain]?.defaultPackage || '';
    if (!currentPkg) return;

    const domainVersions = spmPinnedVersions[currentDomain] || {};
    const nextPinnedVers = {
      ...spmPinnedVersions,
      [currentDomain]: {
        ...domainVersions,
        [currentPkg]: newVersion
      }
    };
    setSpmPinnedVersions(nextPinnedVers);

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        spm_pinned_versions: nextPinnedVers,
        [`spm_pinned_version:${currentDomain}`]: newVersion
      }, reloadTab);
    }
  };

  const toggleDevMode = () => {
    const isDevMode = !!spmDevModeHosts[currentDomain];
    const nextDevHosts = { ...spmDevModeHosts, [currentDomain]: !isDevMode };
    setSpmDevModeHosts(nextDevHosts);

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        spm_dev_mode_hosts: nextDevHosts,
        spm_dev_mode: nextDevHosts
      }, reloadTab);
    }
  };

  const openDevLoader = () => {
    if (!currentDomain || activeTabId === undefined) return;
    // Store context so devloader.html knows which domain/tab to target
    chrome.storage.local.set({
      spm_devloader_domain: currentDomain,
      spm_devloader_tab_id: activeTabId,
    }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('devloader.html') });
    });
  };


  const handleColorChange = (key: string, value: string) => {
    const next = { ...themeVars, [key]: value };
    setThemeVars(next);

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['spm_theme_overrides'], (res) => {
        const overrides = res.spm_theme_overrides || {};
        const nextOverrides: Record<string, string> = {};
        Object.entries(next).forEach(([k, v]) => {
          if (v !== defaultThemeVars[k]) {
            nextOverrides[k] = v;
          }
        });
        if (Object.keys(nextOverrides).length > 0) {
          overrides[currentDomain] = nextOverrides;
        } else {
          delete overrides[currentDomain];
        }
        chrome.storage.local.set({ spm_theme_overrides: overrides }, reloadTab);
      });
    }
  };

  const resetColors = () => {
    setThemeVars(defaultThemeVars);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['spm_theme_overrides'], (res) => {
        const overrides = res.spm_theme_overrides || {};
        delete overrides[currentDomain];
        chrome.storage.local.set({ spm_theme_overrides: overrides }, reloadTab);
      });
    }
  };

  // Load saved path on mount/domain change
  useEffect(() => {
    if (currentDomain && typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([`spm_dev_manifest_path:${currentDomain}`], (res) => {
        setManifestPathInput(res[`spm_dev_manifest_path:${currentDomain}`] || '');
      });
    }
  }, [currentDomain]);

  const handleWatchPath = () => {
    if (!manifestPathInput) return;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        [`spm_dev_manifest_path:${currentDomain}`]: manifestPathInput
      });
    }

    // Send watch command to C++ dev server via WebSocket
    const ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'watch',
        path: manifestPathInput
      }));
    };
    ws.onmessage = (event) => {
      try {
        const res = JSON.parse(event.data);
        if (res.status === 'success') {
          console.log('[SPM Popup] Successfully set dev server watch path:', res.watching);
          reloadTab();
        } else if (res.status === 'error') {
          alert(`Dev Server Error: ${res.message}`);
        }
      } catch (err) {
        console.error('[SPM Popup] Error parsing watch response:', err);
      }
      ws.close();
    };
    ws.onerror = () => {
      alert('Could not connect to SPM Dev Server (ws://localhost:8080). Make sure "spm dev" is running in your terminal.');
      ws.close();
    };
  };

  const isSupportedDomain = !!registry[currentDomain];
  const domainConfig = registry[currentDomain];
  const packages = domainConfig?.packages || {};
  const packageKeys = Object.keys(packages);

  // Extract all unique tags from packages
  const allTags = Array.from(
    new Set(Object.values(packages).flatMap((pkg: any) => pkg.tags || []))
  ) as string[];

  // Filter package keys by selected tag
  const filteredPackageKeys = packageKeys.filter(pkgId => {
    if (!selectedTag) return true;
    return packages[pkgId].tags?.includes(selectedTag);
  });

  const activePackageId = spmActivePackages[currentDomain] || domainConfig?.defaultPackage || '';
  const pkgInfo = packages[activePackageId];
  const versionHistory = pkgInfo?.history || [];
  const pinnedVersion = spmPinnedVersions[currentDomain]?.[activePackageId] || pkgInfo?.activeVersion || '';
  const isDevMode = !!spmDevModeHosts[currentDomain];

  useEffect(() => {
    if (!currentDomain || !activePackageId || !pinnedVersion) return;

    let isMounted = true;
    async function loadActiveManifestVars() {
      try {
        const url = `${WORKER_ORIGIN}/spm/v1/api/themes/${currentDomain}/${activePackageId}/${pinnedVersion}`;
        const res = await fetch(url);
        if (res.ok) {
          const manifest = await res.json();
          const defaultVars = manifest.theme?.cssVariables || {};

          if (isMounted) {
            setDefaultThemeVars(defaultVars);
          }

          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['spm_theme_overrides'], (storageRes) => {
              if (!isMounted) return;
              const overrides = storageRes.spm_theme_overrides?.[currentDomain] || {};
              setThemeVars({ ...defaultVars, ...overrides });
            });
          } else {
            if (isMounted) {
              setThemeVars(defaultVars);
            }
          }
        }
      } catch (err) {
        console.error('[SPM Popup] Error fetching active theme manifest:', err);
      }
    }

    loadActiveManifestVars();

    return () => {
      isMounted = false;
    };
  }, [currentDomain, activePackageId, pinnedVersion]);


  const devDraftParsed = (() => {
    if (!devDraftManifestRaw) return null;
    try { return JSON.parse(devDraftManifestRaw); } catch { return null; }
  })();
  const devDraftLabel = devDraftParsed?.theme?.label || devDraftParsed?.name || 'Local Draft';
  const devDraftVersion = devDraftParsed?.version || '-';

  return (
    <div className="flex flex-col min-h-[460px] font-sans select-none bg-black text-[#d4d4d4]" style={{ width: '320px' }}>

      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#333333] px-4 py-3 bg-[#111111] shrink-0">
        <h1 className="text-sm font-bold text-white tracking-tight">Site Package Manager</h1>
        <span className="text-[10px] bg-[#222222] text-white border border-[#333333] px-2 py-0.5 rounded-full font-medium">v1.0.1</span>
      </header>

      <main className="flex-1 flex flex-col">

        {/* Global toggle */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333]">
          <div>
            <div className="text-xs font-semibold text-white">Global Activation</div>
            <div className="text-[11px] text-zinc-500">Modernization engine</div>
          </div>
          <button
            onClick={toggleGlobal}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${globalEnabled ? 'bg-white' : 'bg-[#333333]'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${globalEnabled ? 'translate-x-4 bg-black' : 'translate-x-0.5 bg-zinc-500'}`}
            />
          </button>
        </div>

        {/* Domain info */}
        <div className="px-4 py-2 border-b border-[#333333]">
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Active Site</div>
          <div className="text-xs text-white font-mono truncate mt-0.5">{currentDomain || '-'}</div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#333333]">
          {(['theme', 'colors'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold capitalize transition ${activeTab === tab ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {tab === 'theme' ? 'Theme' : 'Colors'}
            </button>
          ))}
        </div>

        {/* Tab: Theme */}
        {activeTab === 'theme' && currentDomain && (
          <div className="flex flex-col gap-4 p-4">
            
            {/* Registry Info & Package Selection - hidden when dev draft is loaded */}
            {!isDevMode && isSupportedDomain && (
              <div className="flex flex-col gap-3">
                {allTags.length > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400">Filter by Tag</label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <button
                        onClick={() => setSelectedTag('')}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition ${
                          !selectedTag
                            ? 'bg-white text-black border-white'
                            : 'bg-transparent text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500'
                        }`}
                      >
                        All
                      </button>
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition ${
                            selectedTag === tag
                              ? 'bg-white text-black border-white'
                              : 'bg-transparent text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">Active Package</label>
                  <select
                    disabled={!globalEnabled}
                    value={activePackageId}
                    onChange={e => handlePackageChange(e.target.value)}
                    className="w-full mt-1.5 bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                  >
                    {filteredPackageKeys.map(pkgId => (
                      <option key={pkgId} value={pkgId}>
                        {packages[pkgId].displayName || pkgId}
                      </option>
                    ))}
                  </select>
                </div>

                {activePackageId && (
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400">Package Version</label>
                    <select
                      disabled={!globalEnabled}
                      value={pinnedVersion}
                      onChange={e => handleVersionChange(e.target.value)}
                      className="w-full mt-1.5 bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                    >
                      {versionHistory.map((entry: any) => (
                        <option key={entry.version} value={entry.version}>
                          v{entry.version} ({entry.ref}) - {entry.date}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {!isDevMode && !isSupportedDomain && (
              <div className="bg-[#111111] border border-[#333333] rounded-lg p-3 text-[11px] text-zinc-400 text-center">
                This domain has no registered themes.
              </div>
            )}

            {/* Dev mode loaded draft info */}
            {isDevMode && devDraftManifestRaw && (
              <div className="bg-[#111111] border border-[#333333] rounded p-3 flex flex-col gap-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Active Draft</div>
                <div className="text-xs text-white font-semibold">{devDraftLabel}</div>
                <div className="text-[11px] text-zinc-400">v{devDraftVersion}</div>
                {devDraftCssRaw && (
                  <div className="text-[10px] text-zinc-600 mt-1">{devDraftCssRaw.length} bytes CSS</div>
                )}
              </div>
            )}

            {isDevMode && !devDraftManifestRaw && (
              <div className="bg-[#111111] border border-[#333333] rounded p-3 text-[11px] text-zinc-500 text-center">
                No draft loaded. Select a package folder below.
              </div>
            )}

            {/* Dev Mode Toggle */}
            <div className="flex items-center justify-between border-t border-[#222222] pt-3">
              <div>
                <div className="text-xs font-semibold text-white">Developer Mode</div>
                <div className="text-[10px] text-zinc-500">Local draft bypass</div>
              </div>
              <button
                onClick={toggleDevMode}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${isDevMode ? 'bg-[#7c6af5]' : 'bg-[#333333]'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${isDevMode ? 'translate-x-4 bg-white' : 'translate-x-0.5 bg-zinc-500'}`}
                />
              </button>
            </div>

            {/* Dev Mode folder loader */}
            {isDevMode && (
              <div className="flex flex-col gap-2.5 border-t border-[#222222] pt-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400">Absolute Manifest Path</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="/path/to/manifest.json"
                      value={manifestPathInput}
                      onChange={e => setManifestPathInput(e.target.value)}
                      className="flex-1 bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                    <button
                      onClick={handleWatchPath}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#7c6af5] hover:bg-[#6855df] transition rounded"
                    >
                      Watch
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600 text-center py-0.5">OR</div>
                <button
                  onClick={openDevLoader}
                  className="w-full py-2 text-xs font-semibold text-zinc-400 bg-transparent border border-[#333333] hover:border-zinc-500 hover:text-white transition rounded"
                >
                  Browse Local Folder
                </button>
              </div>
            )}

          </div>
        )}


        {/* Tab: Colors */}
        {activeTab === 'colors' && (
          <div className="flex flex-col gap-0 flex-1 overflow-y-auto">
            {THEME_VARIABLE_META.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a] hover:bg-[#111111] transition">
                <div>
                  <div className="text-xs font-medium text-white">{label}</div>
                  <div className="text-[10px] font-mono text-zinc-600">{key}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">{themeVars[key] || '-'}</span>
                  <input
                    type="color"
                    value={themeVars[key] || '#000000'}
                    onChange={e => handleColorChange(key, e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-[#333333] bg-transparent p-0"
                    style={{ padding: '1px', borderRadius: '6px' }}
                  />
                </div>
              </div>
            ))}
            <div className="p-4">
              <button
                onClick={resetColors}
                className="w-full py-2 text-xs font-semibold text-zinc-400 border border-[#333333] rounded hover:bg-[#111111] transition"
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const rootEl = document.getElementById('popup-root');
if (rootEl) createRoot(rootEl).render(<Popup />);
