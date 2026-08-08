import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../popup/index.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

function DevLoader() {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [targetTabId, setTargetTabId] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Read target domain from storage (set by popup before opening this tab)
    chrome.storage.local.get(['spm_devloader_domain', 'spm_devloader_tab_id'], (res) => {
      if (res.spm_devloader_domain) setDomain(res.spm_devloader_domain);
      if (res.spm_devloader_tab_id) setTargetTabId(res.spm_devloader_tab_id);
    });
  }, []);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatus('loading');
    setMessage('Reading files...');

    let manifestText = '';
    let cssText = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.toLowerCase();
      if (name === 'manifest.json') manifestText = await file.text();
      if (name === 'style.css') cssText = await file.text();
    }

    if (!manifestText) {
      setStatus('error');
      setMessage('No manifest.json found in the selected folder.');
      return;
    }

    try {
      const parsed = JSON.parse(manifestText);
      if (typeof parsed !== 'object' || parsed === null) throw new Error('manifest.json is not a valid JSON object');

      const label = parsed?.theme?.label || parsed?.name || 'Local Draft';
      const version = parsed?.version || '—';

      const updateObj: Record<string, any> = {
        [`dev-draft-manifest:${domain}`]: manifestText,
        [`dev-draft-css:${domain}`]: cssText,
      };

      chrome.storage.local.set(updateObj, () => {
        if (chrome.runtime.lastError) {
          setStatus('error');
          setMessage(`Storage error: ${chrome.runtime.lastError.message}`);
          return;
        }
        setDraftLabel(`${label} v${version}`);
        setStatus('success');
        setMessage(`Draft saved. Reloading tab...`);

        // Reload the target tab and close this tab
        if (targetTabId !== undefined) {
          chrome.tabs.reload(targetTabId, {}, () => {
            setTimeout(() => window.close(), 800);
          });
        } else {
          // Fallback: try to find a tab with this domain
          chrome.tabs.query({ url: `*://${domain}/*` }, (tabs) => {
            if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id, {}, () => setTimeout(() => window.close(), 800));
            else setTimeout(() => window.close(), 1500);
          });
        }
      });
    } catch (err) {
      setStatus('error');
      setMessage(`Error: ${(err as Error).message}`);
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-sm flex flex-col gap-5">

        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Site Package Manager</div>
          <h1 className="text-base font-bold text-white">Load Package Folder</h1>
          {domain && (
            <div className="text-xs text-zinc-500 font-mono">{domain}</div>
          )}
        </div>

        {status === 'idle' && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] text-zinc-400">
              Select the theme folder (e.g. <code className="text-white font-mono">obsidian-dark/</code>).
              The folder must contain <code className="text-white font-mono">manifest.json</code> and <code className="text-white font-mono">style.css</code>.
            </p>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="w-full py-2.5 text-sm font-semibold text-white bg-[#1a1a1a] border border-[#333333] hover:bg-[#2a2a2a] transition rounded"
            >
              Browse Folder
            </button>
            <input
              type="file"
              ref={folderInputRef}
              style={{ display: 'none' }}
              multiple
              onChange={handleFolderSelect}
              {...{ webkitdirectory: '', directory: '' } as any}
            />
          </div>
        )}

        {status === 'loading' && (
          <div className="text-xs text-zinc-400">{message}</div>
        )}

        {status === 'success' && (
          <div className="flex flex-col gap-2">
            <div className="bg-[#111111] border border-[#333333] rounded p-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Draft Loaded</div>
              <div className="text-xs text-white font-semibold">{draftLabel}</div>
            </div>
            <div className="text-[11px] text-zinc-500">{message}</div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#111111] border border-[#333333] rounded p-3 text-xs text-red-400">
              {message}
            </div>
            <button
              onClick={() => { setStatus('idle'); setMessage(''); }}
              className="w-full py-2 text-xs font-semibold text-white bg-[#1a1a1a] border border-[#333333] hover:bg-[#2a2a2a] transition rounded"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const root = document.getElementById('devloader-root')!;
createRoot(root).render(<DevLoader />);
