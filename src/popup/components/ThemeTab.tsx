import React from 'react';

interface ThemeTabProps {
  globalEnabled: boolean;
  isSupportedDomain: boolean;
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
}

export const ThemeTab: React.FC<ThemeTabProps> = ({
  globalEnabled,
  isSupportedDomain,
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
}) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {isSupportedDomain ? (
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
      ) : (
        <div className="bg-[#111111] border border-[#333333] rounded-lg p-3 text-[11px] text-zinc-400 text-center">
          This domain has no registered themes.
        </div>
      )}
    </div>
  );
};
