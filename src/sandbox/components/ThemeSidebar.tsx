import React from 'react';

interface CustomTheme {
  bgPrimary: string;
  bgSecondary: string;
  accent: string;
  textPrimary: string;
  customStyles: string;
}

interface ThemeSidebarProps {
  theme: CustomTheme;
  setTheme: React.Dispatch<React.SetStateAction<CustomTheme>>;
}

export const ThemeSidebar: React.FC<ThemeSidebarProps> = ({
  theme,
  setTheme
}) => {
  return (
    <aside className="w-80 border-r border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Design System Tokens</div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[10px] text-zinc-400 block mb-1">Primary Bg Color</label>
          <input
            type="text"
            value={theme.bgPrimary}
            onChange={(e) => setTheme({ ...theme, bgPrimary: e.target.value })}
            className="w-full bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-400 block mb-1">Accent Color</label>
          <input
            type="text"
            value={theme.accent}
            onChange={(e) => setTheme({ ...theme, accent: e.target.value })}
            className="w-full bg-black border border-[#333333] rounded px-2 py-1 text-xs text-white font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-400 block mb-1">Custom CSS overrides</label>
          <textarea
            rows={10}
            value={theme.customStyles}
            onChange={(e) => setTheme({ ...theme, customStyles: e.target.value })}
            className="w-full bg-black border border-[#333333] rounded p-2 text-[10px] text-zinc-400 font-mono focus:outline-none"
          />
        </div>
      </div>
    </aside>
  );
};
