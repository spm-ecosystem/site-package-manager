import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../content/content.css';
import registryMock from '../../registry.json';


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

  // GitOps registry and preferences
  const [registry, setRegistry] = useState<Record<string, any>>({});
  const [spmActivePackages, setSpmActivePackages] = useState<Record<string, string>>({});
  const [spmPinnedVersions, setSpmPinnedVersions] = useState<Record<string, Record<string, string>>>({});
  const [spmDevModeHosts, setSpmDevModeHosts] = useState<Record<string, boolean>>({});
  const [devDraftManifestRaw, setDevDraftManifestRaw] = useState<string>('');
  const [devDraftCssRaw, setDevDraftCssRaw] = useState<string>('');
  


  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) setActiveTabId(tab.id);
        if (tab?.url) {
          try {
            const domain = new URL(tab.url).hostname;
            setCurrentDomain(domain);
            
            const storageKeys = [
              'spm_global_enabled',
              'spm_gitops_url',
              'spm_active_packages',
              'spm_pinned_versions',
              'spm_dev_mode_hosts',
              'spm_dev_mode',
              'gitops_registry',
              'spm_cached_registry',
              `dev-draft-manifest:${domain}`,
              `dev-draft-css:${domain}`,
              `spm_pinned_package:${domain}`,
              `spm_pinned_version:${domain}`
            ];

            chrome.storage.local.get(storageKeys, (res) => {
              if (res.spm_global_enabled !== undefined) setGlobalEnabled(res.spm_global_enabled);
              
              const activeReg = res.spm_cached_registry || res.gitops_registry || registryMock;
              setRegistry(activeReg);

              const activePkgs = res.spm_active_packages || {};
              if (res[`spm_pinned_package:${domain}`] && !activePkgs[domain]) {
                activePkgs[domain] = res[`spm_pinned_package:${domain}`];
              }
              setSpmActivePackages(activePkgs);

              const pinnedVers = res.spm_pinned_versions || {};
              if (res[`spm_pinned_version:${domain}`]) {
                const pkg = activePkgs[domain] || activeReg[domain]?.defaultPackage || '';
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

              const currentActivePkg = activePkgs[domain] || activeReg[domain]?.defaultPackage || '';
              const pkgInfo = activeReg[domain]?.packages?.[currentActivePkg];
              let baseVars: Record<string, string> = {};
              if (pkgInfo && pkgInfo.theme?.cssVariables) {
                baseVars = { ...pkgInfo.theme.cssVariables };
              }
              
              chrome.storage.local.get(['spm_theme_overrides'], (overridesRes) => {
                const overrides = overridesRes.spm_theme_overrides?.[domain];
                if (overrides) {
                  baseVars = { ...baseVars, ...overrides };
                }
                setThemeVars(baseVars);
              });
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
        overrides[currentDomain] = next;
        chrome.storage.local.set({ spm_theme_overrides: overrides }, reloadTab);
      });
    }
  };

  const resetColors = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['spm_theme_overrides'], (res) => {
        const activePkg = spmActivePackages[currentDomain] || registry[currentDomain]?.defaultPackage || '';
        const pkgInfo = registry[currentDomain]?.packages?.[activePkg];
        let baseVars: Record<string, string> = {};
        if (pkgInfo && pkgInfo.theme?.cssVariables) {
          baseVars = { ...pkgInfo.theme.cssVariables };
        }
        setThemeVars(baseVars);
        
        const overrides = res.spm_theme_overrides || {};
        delete overrides[currentDomain];
        chrome.storage.local.set({ spm_theme_overrides: overrides }, reloadTab);
      });
    } else {
      setThemeVars({});
    }
  };

  const isSupportedDomain = !!registry[currentDomain];
  const domainConfig = registry[currentDomain];
  const packages = domainConfig?.packages || {};
  const packageKeys = Object.keys(packages);
  const activePackageId = spmActivePackages[currentDomain] || domainConfig?.defaultPackage || '';
  const pkgInfo = packages[activePackageId];
  const versionHistory = pkgInfo?.history || [];
  const pinnedVersion = spmPinnedVersions[currentDomain]?.[activePackageId] || pkgInfo?.activeVersion || '';
  const isDevMode = !!spmDevModeHosts[currentDomain];

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
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400">Active Package</label>
                  <select
                    disabled={!globalEnabled}
                    value={activePackageId}
                    onChange={e => handlePackageChange(e.target.value)}
                    className="w-full mt-1.5 bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                  >
                    {packageKeys.map(pkgId => (
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
                This domain is not supported by the GitOps registry.
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
              <div className="flex flex-col gap-2 border-t border-[#222222] pt-3">
                <button
                  onClick={openDevLoader}
                  className="w-full py-2 text-xs font-semibold text-white bg-[#1a1a1a] border border-[#333333] hover:bg-[#2a2a2a] transition rounded"
                >
                  Load Package Folder
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
