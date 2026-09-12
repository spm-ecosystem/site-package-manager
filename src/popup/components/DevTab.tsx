import React from 'react';

export interface DevWorkspaceState {
  domain?: string;
  activeThemeId?: string;
  availableThemes?: Array<{ id: string; label: string }>;
  manifest?: any;
  css?: string;
}

interface DevTabProps {
  currentDomain: string;
  isDevMode: boolean;
  onToggleDevMode: () => void;
  devWorkspaceState: DevWorkspaceState | null;
  onSelectTheme: (themeId: string) => void;
  devDraftManifestRaw: string;
  devDraftLabel: string;
  devDraftVersion: string;
  devDraftCssRaw: string;
  manifestPathInput: string;
  onManifestPathInputChange: (val: string) => void;
  onWatchPath: () => void;
  onOpenDevLoader: () => void;
}

export const DevTab: React.FC<DevTabProps> = ({
  currentDomain,
  isDevMode,
  onToggleDevMode,
  devWorkspaceState,
  onSelectTheme,
  devDraftManifestRaw,
  devDraftLabel,
  devDraftVersion,
  devDraftCssRaw,
  manifestPathInput,
  onManifestPathInputChange,
  onWatchPath,
  onOpenDevLoader,
}) => {
  const availableThemes = devWorkspaceState?.availableThemes || [];
  const activeThemeId = devWorkspaceState?.activeThemeId || '';

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Active Site Header */}
      <div className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
        ACTIVE SITE: <span className="text-white font-mono">{currentDomain || 'N/A'}</span>
      </div>

      {/* Dev Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white">Developer Mode</div>
          <div className="text-[10px] text-zinc-500">Local draft bypass</div>
        </div>
        <button
          onClick={onToggleDevMode}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
            isDevMode ? 'bg-white' : 'bg-zinc-800'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${
              isDevMode ? 'translate-x-4 bg-black' : 'translate-x-0.5 bg-zinc-500'
            }`}
          />
        </button>
      </div>

      {isDevMode && (
        <div className="flex flex-col gap-4 border-t border-[#222222] pt-3">
          {/* Theme Selector Dropdown */}
          {availableThemes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-400">Available Dev Themes</label>
              <select
                value={activeThemeId}
                onChange={(e) => onSelectTheme(e.target.value)}
                className="w-full bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-sans"
              >
                {availableThemes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label || t.id} ({t.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Local Draft Info */}
          {devDraftManifestRaw ? (
            <div className="bg-[#111111] border border-[#222222] rounded p-3 flex flex-col gap-1">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Active Draft</div>
              <div className="text-xs text-white font-semibold">{devDraftLabel}</div>
              <div className="text-[11px] text-zinc-400">v{devDraftVersion}</div>
              {devDraftCssRaw && (
                <div className="text-[10px] text-zinc-500 mt-1">{devDraftCssRaw.length} bytes CSS</div>
              )}
            </div>
          ) : (
            <div className="bg-[#111111] border border-[#222222] rounded p-3 text-[11px] text-zinc-500 text-center">
              No draft loaded. Enter a path or browse a folder below.
            </div>
          )}

          {/* Absolute Manifest Path input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-zinc-400">Absolute Manifest Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="/path/to/manifest.json"
                value={manifestPathInput}
                onChange={e => onManifestPathInputChange(e.target.value)}
                className="flex-1 bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
              />
              <button
                onClick={onWatchPath}
                className="px-3 py-1.5 text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition rounded"
              >
                Watch
              </button>
            </div>
          </div>

          <div className="text-[10px] text-zinc-600 text-center py-0.5">OR</div>

          {/* Manual folder loader */}
          <button
            onClick={onOpenDevLoader}
            className="w-full py-2 text-xs font-semibold text-zinc-400 bg-transparent border border-[#333333] hover:border-zinc-500 hover:text-white transition rounded"
          >
            Browse Local Folder
          </button>
        </div>
      )}

      {!isDevMode && (
        <div className="bg-[#111111] border border-[#222222] rounded p-4 text-[11px] text-zinc-500 text-center">
          Enable Developer Mode to load, watch, and test local theme files in real-time.
        </div>
      )}
    </div>
  );
};
