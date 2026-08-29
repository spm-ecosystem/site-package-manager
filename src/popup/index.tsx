import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../content/content.css';

// Import subcomponents
import { Header } from './components/Header';
import { ActiveSiteBar } from './components/ActiveSiteBar';
import { ThemeTab } from './components/ThemeTab';
import { ColorsTab } from './components/ColorsTab';
import { DevTab } from './components/DevTab';

const WORKER_ORIGIN = 'https://spm.hexacloud.net.br';

export async function computeManifestIntegrity(domain: string, themeName: string, version: string): Promise<string | null> {
  if (!domain || !themeName || !version) return null;
  try {
    const res = await fetch(`${WORKER_ORIGIN}/spm/v1/api/themes/${domain}/${themeName}/${version}/manifest.json`);
    if (!res.ok) return null;
    const rawText = await res.text();
    if (!rawText) return null;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256-${hex}`;
  } catch (e) {
    console.error('[SPM Popup] Error fetching manifest integrity:', e);
    return null;
  }
}

function Popup() {
  const [globalEnabled, setGlobalEnabled]   = useState<boolean>(true);
  const [currentDomain, setCurrentDomain]   = useState<string>('');
  const [activeTabId, setActiveTabId]       = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab]           = useState<'theme' | 'colors' | 'dev'>('theme');
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
                    if (!item.version) continue;
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
                  pinnedVers[domain][pkg] = res[`spm_pinned_version:${domain}`];
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

  const toggleGlobal = async () => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      setGlobalEnabled(prev => !prev);
      return;
    }

    try {

      const res = await chrome.storage.local.get(['spm_global_enabled']);
      const nextState = res.spm_global_enabled === false;

      setGlobalEnabled(nextState);

      await chrome.storage.local.set({ spm_global_enabled: nextState })

      const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});

    if (activeTab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (isEnabled) => {
          try {
            window.localStorage.setItem('__spm_global_enabled_cache', String(isEnabled));
          } catch (e) {}
        },
        args: [nextState]
      });
    }

    reloadTab();

    } catch (e) {
      console.error('[SPM] Error on alternate globally state', e)
    }

  };

  const handlePackageChange = async (newPkgId: string) => {
    const nextActivePkgs = { ...spmActivePackages, [currentDomain]: newPkgId };
    setSpmActivePackages(nextActivePkgs);

    const selectedVersion = spmPinnedVersions[currentDomain]?.[newPkgId] || packages[newPkgId]?.activeVersion || '';
    const activePkgKey = `spm_pinned_package:${currentDomain}`;
    const activeVerKey = `spm_pinned_version:${currentDomain}`;
    const domainIntegrityKey = `spm_pinned_integrity:${currentDomain}`;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      const storageUpdate: Record<string, any> = {
        spm_active_packages: nextActivePkgs,
        [activePkgKey]: newPkgId
      };

      if (selectedVersion) {
        storageUpdate[activeVerKey] = selectedVersion;
        const integrityVal = await computeManifestIntegrity(currentDomain, newPkgId, selectedVersion);
        if (integrityVal) {
          storageUpdate[`spm_pinned_integrity:${currentDomain}:${newPkgId}:${selectedVersion}`] = integrityVal;
          storageUpdate[domainIntegrityKey] = integrityVal;
        }
      }

      chrome.storage.local.set(storageUpdate, reloadTab);
    }
  };

  const handleVersionChange = async (newVersion: string) => {
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
      const activePkgKey = `spm_pinned_package:${currentDomain}`;
      const activeVerKey = `spm_pinned_version:${currentDomain}`;
      const domainIntegrityKey = `spm_pinned_integrity:${currentDomain}`;

      const storageUpdate: Record<string, any> = {
        spm_pinned_versions: nextPinnedVers,
        [activePkgKey]: currentPkg,
        [activeVerKey]: newVersion
      };

      const integrityVal = await computeManifestIntegrity(currentDomain, currentPkg, newVersion);
      if (integrityVal) {
        storageUpdate[`spm_pinned_integrity:${currentDomain}:${currentPkg}:${newVersion}`] = integrityVal;
        storageUpdate[domainIntegrityKey] = integrityVal;
      }

      chrome.storage.local.set(storageUpdate, reloadTab);
    }
  };

  const toggleDevMode = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['spm_dev_mode_hosts'], (res) => {
        const devHosts = res.spm_dev_mode_hosts || {};
        const isDev = !!devHosts[currentDomain];
        const nextDevHosts = { ...devHosts, [currentDomain]: !isDev };
        setSpmDevModeHosts(nextDevHosts);
        chrome.storage.local.set({
          spm_dev_mode_hosts: nextDevHosts,
          spm_dev_mode: nextDevHosts
        }, reloadTab);
      });
    } else {
      const isDev = !!spmDevModeHosts[currentDomain];
      setSpmDevModeHosts({ ...spmDevModeHosts, [currentDomain]: !isDev });
    }
  };

  const openDevLoader = () => {
    if (!currentDomain || activeTabId === undefined) return;
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

  // Load saved path on domain change
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

  // Extract unique tags
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
  const versionHistory = (pkgInfo?.history || []).slice().sort((a: any, b: any) => {
    const pa = (a.version || '0.0.0').split('.').map(Number);
    const pb = (b.version || '0.0.0').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const numA = pa[i] || 0;
      const numB = pb[i] || 0;
      if (numA !== numB) return numB - numA;
    }
    return 0;
  });
  const pinnedVersion = spmPinnedVersions[currentDomain]?.[activePackageId] || pkgInfo?.activeVersion || '';
  const isDevMode = !!spmDevModeHosts[currentDomain];

  useEffect(() => {
    if (!currentDomain || !activePackageId || !pinnedVersion) return;

    let isMounted = true;
    async function loadActiveManifestVars() {
      try {
        const url = `${WORKER_ORIGIN}/spm/v1/api/themes/${currentDomain}/${activePackageId}/${pinnedVersion}/manifest.json`;
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
    <div className="flex flex-col h-[480px] font-sans select-none bg-black text-[#d4d4d4] overflow-hidden" style={{ width: '320px' }}>
      <Header globalEnabled={globalEnabled} onToggleGlobal={toggleGlobal} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ActiveSiteBar domain={currentDomain} />

        {/* Tabs Navigation */}
        <div className="flex border-b border-[#333333]">
          {(['theme', 'colors', 'dev'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold capitalize transition ${
                activeTab === tab ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'theme' ? 'Theme' : tab === 'colors' ? 'Colors' : 'Dev'}
            </button>
          ))}
        </div>

        {/* Tab: Theme */}
        {activeTab === 'theme' && currentDomain && (
          <ThemeTab
            globalEnabled={globalEnabled}
            isSupportedDomain={isSupportedDomain}
            packages={packages}
            filteredPackageKeys={filteredPackageKeys}
            activePackageId={activePackageId}
            onPackageChange={handlePackageChange}
            versionHistory={versionHistory}
            pinnedVersion={pinnedVersion}
            onVersionChange={handleVersionChange}
            allTags={allTags}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
          />
        )}

        {/* Tab: Colors */}
        {activeTab === 'colors' && (
          <ColorsTab
            themeVars={themeVars}
            onColorChange={handleColorChange}
            onResetColors={resetColors}
          />
        )}

        {/* Tab: Dev */}
        {activeTab === 'dev' && (
          <DevTab
            isDevMode={isDevMode}
            onToggleDevMode={toggleDevMode}
            devDraftManifestRaw={devDraftManifestRaw}
            devDraftLabel={devDraftLabel}
            devDraftVersion={devDraftVersion}
            devDraftCssRaw={devDraftCssRaw}
            manifestPathInput={manifestPathInput}
            onManifestPathInputChange={setManifestPathInput}
            onWatchPath={handleWatchPath}
            onOpenDevLoader={openDevLoader}
          />
        )}
      </main>
    </div>
  );
}

const rootEl = document.getElementById('popup-root');
if (rootEl) createRoot(rootEl).render(<Popup />);
