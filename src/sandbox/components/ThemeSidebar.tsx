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
  onElementDrop: (data: { selector: string; tagName: string; id: string; classes: string }) => void;
}

export const ThemeSidebar: React.FC<ThemeSidebarProps> = ({
  theme,
  setTheme,
  onElementDrop
}) => {
  return (
    <aside className="w-80 border-r border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
      
      {/* Drag & Drop Builder Zone */}
      <div 
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('border-purple-500', 'bg-purple-500/5');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-purple-500', 'bg-purple-500/5');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-purple-500', 'bg-purple-500/5');
          const selector = e.dataTransfer.getData('text/plain');
          const tagName = e.dataTransfer.getData('spm/element-tag');
          const id = e.dataTransfer.getData('spm/element-id');
          const classes = e.dataTransfer.getData('spm/element-classes');
          
          if (selector) {
            onElementDrop({ selector, tagName, id, classes });
          }
        }}
        className="border-2 border-dashed border-[#333333] rounded-lg p-5 text-center transition hover:border-purple-500/50 bg-zinc-950/40 cursor-grab flex flex-col items-center justify-center gap-1.5 group shrink-0"
      >
        <div className="text-zinc-500 group-hover:text-purple-400 transition text-base">✨</div>
        <div className="text-xs font-semibold text-zinc-400 group-hover:text-white transition">Drag & Drop Builder</div>
        <p className="text-[10px] text-zinc-500 leading-snug">Drag elements from Legacy View and drop here to convert them into components</p>
      </div>

      <div className="border-t border-[#222222] pt-2 shrink-0">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Design System Tokens</div>
      </div>

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
