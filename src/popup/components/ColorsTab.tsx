import React from 'react';

export interface ThemeVariable {
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

interface ColorsTabProps {
  themeVars: Record<string, string>;
  onColorChange: (key: string, value: string) => void;
  onResetColors: () => void;
}

export const ColorsTab: React.FC<ColorsTabProps> = ({
  themeVars,
  onColorChange,
  onResetColors,
}) => {
  return (
    <div className="flex flex-col gap-0 flex-1 overflow-y-auto">
      {THEME_VARIABLE_META.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a] hover:bg-[#111111] transition">
          <div>
            <div className="text-xs font-medium text-white">{label}</div>
            <div className="text-[10px] font-mono text-zinc-600">{key}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500">{themeVars[key] || '-'}</span>
            <input
              type="color"
              value={themeVars[key] || '#000000'}
              onChange={e => onColorChange(key, e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-[#333333] bg-transparent p-0"
              style={{ padding: '1px', borderRadius: '6px' }}
            />
          </div>
        </div>
      ))}
      <div className="p-4">
        <button
          onClick={onResetColors}
          className="w-full py-2 text-xs font-semibold text-zinc-400 border border-[#333333] rounded hover:bg-[#111111] transition"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
};
