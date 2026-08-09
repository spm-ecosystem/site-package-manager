(function() {

  // antiFlicker element
  const antiFlickerStyle = document.createElement('style');
  antiFlickerStyle.id = 'spm-anti-flicker';

  antiFlickerStyle.textContent = `
      html {
        background-color: var(--spm-bg-primary, #121212) !important;
      }
      body {
        opacity: 0 !important;
        transition: opacity 0.2s ease-in-out !important;
      }
    `;

  if (document.documentElement) {
    document.documentElement.appendChild(antiFlickerStyle);
  } else {
    // fallback
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.appendChild(antiFlickerStyle);
    });
  }

  let confirmMode: 'idle' | 'dry-run' | 'force-true' = 'idle';
  let lastConfirmMessage = '';

  window.alert = function(msg) {
    window.dispatchEvent(new CustomEvent('spm-show-toast', { 
      detail: { message: String(msg), type: 'info' } 
    }));
  };

  const originalConfirm = window.confirm;
  window.confirm = function(msg) {
    lastConfirmMessage = String(msg);
    
    // Notify the content script that confirm was called
    window.dispatchEvent(new CustomEvent('spm-confirm-called', {
      detail: { message: lastConfirmMessage, mode: confirmMode }
    }));

    if (confirmMode === 'dry-run') {
      return false; // Abort the actual execution during the dry-run probe
    }
    if (confirmMode === 'force-true') {
      return true; // Auto-confirm when user clicks Yes in the React confirm dialog
    }

    // Default fallback (returns native prompt if called out of SPM click contexts)
    return originalConfirm(msg);
  };

  // Listen to control events from the content script (isolated world)
  window.addEventListener('spm-set-confirm-mode', (e: Event) => {
    const customEvent = e as CustomEvent<{ mode: typeof confirmMode }>;
    if (customEvent.detail && customEvent.detail.mode) {
      confirmMode = customEvent.detail.mode;
    }
  });
})();
