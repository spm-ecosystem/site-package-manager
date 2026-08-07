import { createRoot } from 'react-dom/client';
import '../content/content.css';

function Popup() {
  return (
    <div className="p-4 flex flex-col gap-4 font-sans select-none min-h-[400px]">
      <header className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h1 className="text-lg font-bold text-indigo-400 tracking-tight">Site Package Manager</h1>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">v1.0.0</span>
      </header>

      <main className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
          <div>
            <div className="text-sm font-semibold text-slate-200">Global Activation</div>
            <div className="text-[11px] text-slate-400">Toggle modernization motor</div>
          </div>
          <button className="px-4 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition">
            Enabled
          </button>
        </div>
      </main>
    </div>
  );
}

const rootEl = document.getElementById('popup-root');
if (rootEl) {
  createRoot(rootEl).render(<Popup />);
}
