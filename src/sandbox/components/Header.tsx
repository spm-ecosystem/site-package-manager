import React from 'react';

interface HeaderProps {
  urlInput: string;
  setUrlInput: (val: string) => void;
  wsStatus: string;
  handleFetchTarget: (e: React.FormEvent) => void;
  handleDownload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  urlInput,
  setUrlInput,
  wsStatus,
  handleFetchTarget,
  handleDownload
}) => {
  return (
    <header className="flex items-center justify-between border-b border-[#333333] px-6 py-3 bg-[#111111] shrink-0 gap-4">
      <div className="flex items-center gap-4 shrink-0">
        <h1 className="text-sm font-bold text-white tracking-tight">SPM Visual Sandbox IDE</h1>
      </div>
      
      {/* Dynamic target url input */}
      <form onSubmit={handleFetchTarget} className="flex-1 max-w-[500px] flex items-center gap-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Target URL to modernise..."
          className="w-full bg-black border border-[#333333] px-3 py-1 text-xs text-white rounded focus:outline-none focus:border-zinc-500 font-mono"
        />
        <button 
          type="submit"
          className="px-3 py-1 bg-zinc-800 text-white rounded text-xs font-semibold hover:bg-zinc-700 transition"
        >
          Fetch
        </button>
      </form>

      <div className="flex items-center gap-4 shrink-0">
        <button 
          onClick={handleDownload}
          className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition"
        >
          Export JSON
        </button>
        <span className={`text-[11px] border px-3 py-1 rounded font-medium ${wsStatus === 'Connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          Dev Server: {wsStatus}
        </span>
      </div>
    </header>
  );
};
