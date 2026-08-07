import { createRoot } from 'react-dom/client';
import '../content/content.css';

function SandboxApp() {
  return (
    <div className="flex flex-col h-screen font-sans select-none bg-black text-[#d4d4d4]">
      <header className="flex items-center justify-between border-b border-[#333333] px-6 py-4 bg-[#111111] shrink-0">
        <h1 className="text-xl font-bold text-white tracking-tight font-sans">SPM Visual Sandbox IDE</h1>
        <span className="text-[11px] bg-[#222222] border border-[#333333] px-3 py-1 rounded font-medium text-zinc-400 font-sans">Dev Server: Disconnected</span>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Components Left Panel */}
        <aside className="w-64 border-r border-[#333333] bg-[#111111] p-4 flex flex-col gap-4">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-sans">Primitives</div>
          <div className="flex flex-col gap-2">
            {['UiBox', 'UiGrid', 'UiFlexRow', 'UiText', 'UiImage', 'UiLink'].map(item => (
              <div key={item} className="p-3 bg-[#222222] border border-[#333333] rounded cursor-pointer hover:border-zinc-500 transition text-sm text-white font-medium font-sans">
                {item}
              </div>
            ))}
          </div>
        </aside>

        {/* Workspace Canvas Panel */}
        <section className="flex-1 flex flex-col bg-[#050505]">
          <div className="flex-1 border-b border-[#333333] p-4 overflow-y-auto">
            <div className="text-xs font-bold text-zinc-500 uppercase mb-3 font-sans">Legacy Preview</div>
            <div className="h-full border border-dashed border-[#333333] rounded flex items-center justify-center text-sm text-zinc-600 bg-black/40 font-sans">
              Paste URL or fetch content
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-xs font-bold text-zinc-500 uppercase mb-3 font-sans">Modern Layout Canvas</div>
            <div className="h-full border border-dashed border-[#333333] rounded flex items-center justify-center text-sm text-zinc-600 bg-black/40 font-sans">
              Drag primitives here to design layout
            </div>
          </div>
        </section>

        {/* Properties Right Panel */}
        <aside className="w-80 border-l border-[#333333] bg-[#111111] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-sans">Properties & Output</div>
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-zinc-400 font-sans">Layout JSON Schema</label>
            <pre className="flex-1 bg-black border border-[#333333] rounded p-3 text-[10px] text-zinc-400 font-mono overflow-auto">
              {"{}"}
            </pre>
          </div>
        </aside>
      </main>
    </div>
  );
}

const rootEl = document.getElementById('sandbox-root');
if (rootEl) {
  createRoot(rootEl).render(<SandboxApp />);
}
