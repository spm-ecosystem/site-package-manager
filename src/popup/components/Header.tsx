import React from 'react';

interface HeaderProps {
  globalEnabled: boolean;
  onToggleGlobal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ globalEnabled, onToggleGlobal }) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-[#333333]">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#7c6af5] animate-pulse" />
        <span className="text-sm font-bold text-white tracking-tight">Site Package Manager</span>
      </div>
      <button
        onClick={onToggleGlobal}
        className={`px-3 py-1 text-[11px] font-semibold rounded border transition ${
          globalEnabled
            ? 'bg-zinc-900 text-emerald-400 border-emerald-950 hover:bg-zinc-800'
            : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800'
        }`}
      >
        {globalEnabled ? 'Active' : 'Disabled'}
      </button>
    </header>
  );
};
