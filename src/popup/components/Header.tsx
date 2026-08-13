import React from 'react';

interface HeaderProps {
  globalEnabled: boolean;
  onToggleGlobal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ globalEnabled, onToggleGlobal }) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#0c0c0c]">
      <div className="flex items-center">
        <span className="text-xs font-bold text-white tracking-wider uppercase">Site Package Manager</span>
      </div>
      <button
        onClick={onToggleGlobal}
        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition duration-150 ${
          globalEnabled
            ? 'bg-white text-black border-white hover:bg-zinc-200'
            : 'bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-400 hover:border-zinc-700'
        }`}
      >
        {globalEnabled ? 'Active' : 'Disabled'}
      </button>
    </header>
  );
};
