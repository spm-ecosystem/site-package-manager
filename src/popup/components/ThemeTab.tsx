import React from 'react';

interface ThemeTabProps {
  globalEnabled: boolean;
  isSupportedDomain: boolean;
  isDevMode: boolean;
  onToggleDevMode: () => void;
  packages: Record<string, any>;
  filteredPackageKeys: string[];
  activePackageId: string;
  onPackageChange: (id: string) => void;
  versionHistory: any[];
  pinnedVersion: string;
  onVersionChange: (version: string) => void;
  allTags: string[];
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  devDraftManifestRaw: string;
  devDraftLabel: string;
  devDraftVersion: string;
  devDraftCssRaw: string;
  manifestPathInput: string;
  onManifestPathInputChange: (val: string) => void;
  onWatchPath: () => void;
  onOpenDevLoader: () => void;
}

export const ThemeTab: React.FC<ThemeTabProps> = ({
  globalEnabled,
  isSupportedDomain,
  isDevMode,
  onToggleDevMode,
  packages,
  filteredPackageKeys,
  activePackageId,
  onPackageChange,
  versionHistory,
  pinnedVersion,
  onVersionChange,
  allTags,
  selectedTag,
  onSelectTag,
  devDraftManifestRaw,
  devDraftLabel,
  devDraftVersion,
  devDraftCssRaw,
  manifestPathInput,
  onManifestPathInputChange,
  onWatchPath,
  onOpenDevLoader,
}) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Registry Info & Package Selection - hidden when dev draft is loaded */}
      {!isDevMode && isSupportedDomain && (
        <div className="flex flex-col gap-3">
          {allTags.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400">Filter by Tag</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <button
                  onClick={() => onSelectTag('')}
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
                    onClick={() => onSelectTag(tag)}
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
              onChange={e => onPackageChange(e.target.value)}
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
                onChange={e => onVersionChange(e.target.value)}
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
          onClick={onToggleDevMode}
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
                onChange={e => onManifestPathInputChange(e.target.value)}
                className="flex-1 bg-black border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
              />
              <button
                onClick={onWatchPath}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#7c6af5] hover:bg-[#6855df] transition rounded"
              >
                Watch
              </button>
            </div>
          </div>
          <div className="text-[10px] text-zinc-600 text-center py-0.5">OR</div>
          <button
            onClick={onOpenDevLoader}
            className="w-full py-2 text-xs font-semibold text-zinc-400 bg-transparent border border-[#333333] hover:border-zinc-500 hover:text-white transition rounded"
          >
            Browse Local Folder
          </button>
        </div>
      )}
    </div>
  );
};
