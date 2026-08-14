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

      #spm-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: var(--spm-bg-primary, #121212);
      z-index: 2147483647; /* Z-index máximo do navegador */
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 1;
      transition: opacity 0.3s ease-in-out;
      pointer-events: all;
    }

    .spm-spinner {
      width: 40px !important;
      height: 40px !important;
      background-color: transparent !important;
      border: 3px solid var(--spm-bg-tertiary, rgba(255, 255, 255, 0.1)) !important;
      border-radius: 50% !important;
      border-top-color: var(--spm-accent, #7c6af5) !important;
      animation: spm-spin 1s linear infinite !important;
      box-sizing: border-box !important;
    }

    @keyframes spm-spin {
      to { transform: rotate(360deg); }
    }
    `;
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'spm-loading-overlay';
    
    const spinner = document.createElement('div');
    spinner.className = 'spm-spinner';
    loadingOverlay.appendChild(spinner);

  const injectAntiFlicker = () => {
    document.documentElement.appendChild(antiFlickerStyle);
    document.documentElement.appendChild(loadingOverlay);
  };

  if (document.documentElement) {
    injectAntiFlicker();
  } else {
    // fallback
    document.addEventListener('DOMContentLoaded', () => {
      injectAntiFlicker();
    });
  }

  let confirmMode: 'idle' | 'dry-run' | 'force-true' = 'idle';
  let lastConfirmMessage = '';

  window.alert = function(msg) {
    const detail = { message: String(msg), type: 'info' };
    window.dispatchEvent(new CustomEvent('spm-show-toast', { detail }));
    if (window.top && window.top !== window) {
      try {
        window.top.dispatchEvent(new CustomEvent('spm-show-toast', { detail }));
      } catch (e) {
        window.top.postMessage({ type: 'spm-show-toast', message: String(msg), toastType: 'info' }, '*');
      }
    }
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
