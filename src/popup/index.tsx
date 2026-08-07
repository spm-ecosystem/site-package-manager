import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../content/content.css';
import registryMock from '../../websites/registry.json';
import safebooruConfig from '../../websites/safebooru.json';

interface RegistryItem {
  id: string;
  name: string;
  description: string;
  domain: string;
  manifestPath: string;
}

interface ThemeVariable {
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
  const [themesList, setThemesList]         = useState<RegistryItem[]>([]);
  const [activeThemeId, setActiveThemeId]   = useState<string>('');
  const [loading, setLoading]               = useState<boolean>(false);
  const [activeTabId, setActiveTabId]       = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab]           = useState<'theme' | 'colors'>('theme');

  // Theme CSS variables — base from manifest + user overrides
  const [themeVars, setThemeVars] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries((safebooruConfig as any).theme.cssVariables as Record<string, string>)
        .filter(([k]) => k.startsWith('--spm-'))
    ) as Record<string, string>
  );

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) setActiveTabId(tab.id);
        if (tab?.url) {
          try {
            const domain = new URL(tab.url).hostname;
            setCurrentDomain(domain);
            chrome.storage.local.get(['spm_global_enabled', 'spm_active_themes', 'spm_theme_overrides'], (res) => {
              if (res.spm_global_enabled !== undefined) setGlobalEnabled(res.spm_global_enabled);
              if (res.spm_active_themes?.[domain]) setActiveThemeId(res.spm_active_themes[domain]);
              if (res.spm_theme_overrides?.[domain]) {
                setThemeVars(prev => ({ ...prev, ...res.spm_theme_overrides[domain] }));
              }
            });
          } catch {
            setCurrentDomain('');
          }
        }
      });
    } else {
      setCurrentDomain('safebooru.org');
    }
    setThemesList(registryMock);
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

  const handleInstallTheme = (themeId: string) => {
    if (!themeId) {
      setActiveThemeId('');
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['spm_active_themes'], (res) => {
          const active = res.spm_active_themes || {};
          delete active[currentDomain];
          chrome.storage.local.set({ spm_active_themes: active }, reloadTab);
        });
      }
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setActiveThemeId(themeId);
      setLoading(false);
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['spm_installed_themes', 'spm_active_themes'], (res) => {
          const installed = res.spm_installed_themes || {};
          const active = res.spm_active_themes || {};
          installed[themeId] = safebooruConfig;
          active[currentDomain] = themeId;
          chrome.storage.local.set({ spm_installed_themes: installed, spm_active_themes: active }, reloadTab);
        });
      }
    }, 400);
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
    const base = Object.fromEntries(
      Object.entries((safebooruConfig as any).theme.cssVariables as Record<string, string>)
        .filter(([k]) => k.startsWith('--spm-'))
    ) as Record<string, string>;
    setThemeVars(base);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['spm_theme_overrides'], (res) => {
        const overrides = res.spm_theme_overrides || {};
        delete overrides[currentDomain];
        chrome.storage.local.set({ spm_theme_overrides: overrides }, reloadTab);
      });
    }
  };

  const matchingThemes = themesList.filter(t => t.domain === currentDomain);

  return (
    <div className="flex flex-col min-h-[460px] font-sans select-none bg-black text-[#d4d4d4]" style={{ width: '320px' }}>

      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#333333] px-4 py-3 bg-[#111111] shrink-0">
        <h1 className="text-sm font-bold text-white tracking-tight">Site Package Manager</h1>
        <span className="text-[10px] bg-[#222222] text-white border border-[#333333] px-2 py-0.5 rounded-full font-medium">v1.3.0</span>
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
          <div className="text-xs text-white font-mono truncate mt-0.5">{currentDomain || '—'}</div>
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
          <div className="flex flex-col gap-3 p-4">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400">Layout Theme</label>
              <select
                disabled={loading || !globalEnabled}
                value={activeThemeId}
                onChange={e => handleInstallTheme(e.target.value)}
                className="w-full mt-1.5 bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 disabled:opacity-50"
              >
                <option value="">Legacy View (Disabled)</option>
                {matchingThemes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {loading && (
                <div className="text-[11px] text-zinc-500 mt-1.5">Downloading theme…</div>
              )}
            </div>

            {activeThemeId && (
              <div className="bg-[#111111] border border-[#333333] rounded-lg p-3 text-[11px] text-zinc-400">
                <div className="font-semibold text-white text-xs mb-1">{matchingThemes.find(t => t.id === activeThemeId)?.name}</div>
                <div>{matchingThemes.find(t => t.id === activeThemeId)?.description}</div>
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
                  <span className="text-[10px] font-mono text-zinc-500">{themeVars[key] || '—'}</span>
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
