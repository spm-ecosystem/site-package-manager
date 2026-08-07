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

function Popup() {
  const [globalEnabled, setGlobalEnabled] = useState<boolean>(true);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [themesList, setThemesList] = useState<RegistryItem[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect domain of the active browser tab
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.url) {
          try {
            const urlObj = new URL(tab.url);
            const domain = urlObj.hostname;
            setCurrentDomain(domain);

            // 2. Load storage status
            chrome.storage.local.get(['spm_global_enabled', 'spm_active_themes'], (res) => {
              if (res.spm_global_enabled !== undefined) {
                setGlobalEnabled(res.spm_global_enabled);
              }
              if (res.spm_active_themes && res.spm_active_themes[domain]) {
                setActiveThemeId(res.spm_active_themes[domain]);
              }
            });
          } catch (e) {
            setCurrentDomain('');
          }
        }
      });
    } else {
      // Offline fallback mock data
      setCurrentDomain('safebooru.org');
    }

    setThemesList(registryMock);
  }, []);

  const toggleGlobal = () => {
    const nextVal = !globalEnabled;
    setGlobalEnabled(nextVal);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ spm_global_enabled: nextVal });
    }
  };

  const handleInstallTheme = async (themeId: string) => {
    if (!themeId) {
      setActiveThemeId('');
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['spm_active_themes'], (res) => {
          const active = res.spm_active_themes || {};
          delete active[currentDomain];
          chrome.storage.local.set({ spm_active_themes: active });
        });
      }
      return;
    }

    setLoading(true);
    // Simulate remote fetching delays from github
    setTimeout(() => {
      setActiveThemeId(themeId);
      setLoading(false);

      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['spm_installed_themes', 'spm_active_themes'], (res) => {
          const installed = res.spm_installed_themes || {};
          const active = res.spm_active_themes || {};

          // Mock remote download by copying the local safebooruConfig mock file
          installed[themeId] = safebooruConfig;
          active[currentDomain] = themeId;

          chrome.storage.local.set({
            spm_installed_themes: installed,
            spm_active_themes: active
          });
        });
      }
    }, 400);
  };

  const matchingThemes = themesList.filter(t => t.domain === currentDomain);

  return (
    <div className="p-4 flex flex-col gap-4 font-sans select-none min-h-[400px]">
      <header className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h1 className="text-lg font-bold text-indigo-400 tracking-tight">Site Package Manager</h1>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">v1.1.0</span>
      </header>

      <main className="flex-1 flex flex-col gap-4">
        {/* Toggle Box */}
        <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
          <div>
            <div className="text-sm font-semibold text-slate-200">Global Activation</div>
            <div className="text-[11px] text-slate-400">Toggle modernization motor</div>
          </div>
          <button 
            onClick={toggleGlobal}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition duration-150 ${globalEnabled ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
          >
            {globalEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Local Active Tab Context */}
        <div className="flex flex-col gap-2 bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
          <div className="text-xs text-slate-400 font-medium tracking-wide uppercase">Active Site</div>
          <div className="text-sm font-semibold text-slate-200 truncate">{currentDomain || 'Unknown Page'}</div>

          {currentDomain && (
            <div className="mt-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-400">Layout Theme</label>
              <select
                disabled={loading || !globalEnabled}
                value={activeThemeId}
                onChange={(e) => handleInstallTheme(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Legacy View (Disabled)</option>
                {matchingThemes.map(theme => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const rootEl = document.getElementById('popup-root');
if (rootEl) {
  createRoot(rootEl).render(<Popup />);
}
