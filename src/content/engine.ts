export function extractValue(element: Element, queryRule: string): string | null {
  const parts = queryRule.split('|').map((s) => s.trim());
  const selector = parts[0];
  const extractor = parts[1];

  if (!selector || !extractor) return null;

  const targetEl = selector === 'self' ? element : element.querySelector(selector);
  if (!targetEl) return null;

  if (extractor.startsWith('attr:')) {
    const attrName = extractor.substring(5);
    return targetEl.getAttribute(attrName);
  }

  if (extractor === 'text') {
    return targetEl.textContent;
  }

  if (extractor === 'html') {
    return targetEl.innerHTML;
  }

  if (extractor === 'hrefOrOnclick') {
    const href = targetEl.getAttribute('href');
    if (href && href !== '#' && !href.startsWith('javascript:')) return href;
    const onclick = targetEl.getAttribute('onclick') || '';
    const match = onclick.match(/(?:document|window)\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i) || onclick.match(/document\.location\s*=\s*['"]([^'"]+)['"]/i);
    if (match) return match[1];
    return href || null;
  }

  if (extractor === 'selector') {
    let spmId = targetEl.getAttribute('data-spm-id');
    if (!spmId) {
      spmId = 'spm-id-' + Math.random().toString(36).substring(2, 9);
      targetEl.setAttribute('data-spm-id', spmId);
    }
    return `[data-spm-id="${spmId}"]`;
  }

  if (extractor === 'nextSiblingText') {
    const next = targetEl.nextElementSibling;
    return next ? next.textContent : null;
  }

  return null;
}

export function triggerProxyClick(targetSelector: string) {
  const originalEl = document.querySelector(targetSelector);
  if (!originalEl) return;

  let confirmCalled = false;
  let capturedMessage = '';

  const handleConfirmCalled = (e: Event) => {
    const customEvent = e as CustomEvent<{ message: string; mode: string }>;
    if (customEvent.detail.mode === 'dry-run') {
      confirmCalled = true;
      capturedMessage = customEvent.detail.message;
    }
  };

  window.addEventListener('spm-confirm-called', handleConfirmCalled);

  // 1. Put interceptor in dry-run mode
  window.dispatchEvent(new CustomEvent('spm-set-confirm-mode', { detail: { mode: 'dry-run' } }));

  // 2. Trigger click
  (originalEl as HTMLElement).click();

  // 3. Reset to idle
  window.dispatchEvent(new CustomEvent('spm-set-confirm-mode', { detail: { mode: 'idle' } }));

  window.removeEventListener('spm-confirm-called', handleConfirmCalled);

  if (confirmCalled) {
    // 4. Show the modern custom confirmation dialog
    window.dispatchEvent(new CustomEvent('spm-show-confirm-dialog', {
      detail: {
        message: capturedMessage,
        onConfirm: () => {
          // Put interceptor in force-true mode to auto-approve confirm
          window.dispatchEvent(new CustomEvent('spm-set-confirm-mode', { detail: { mode: 'force-true' } }));
          // Click again
          (originalEl as HTMLElement).click();
          // Reset to idle
          window.dispatchEvent(new CustomEvent('spm-set-confirm-mode', { detail: { mode: 'idle' } }));
        }
      }
    }));
  }
}

export function revealPage() {
  setTimeout(() => {
    const antiFlickerStyle = document.getElementById('spm-anti-flicker');

    if(!antiFlickerStyle) return;

    antiFlickerStyle.id = 'spm-anti-flicker';

    antiFlickerStyle.textContent = `
        html {
          background-color: var(--spm-bg-primary) !important;
        }
        body {
          opacity: 1 !important;
          transition: opacity 0.2s ease-in-out !important;
        }
      `;
    setTimeout(() => {
      antiFlickerStyle.remove();
    }, 300);
  }, 50)

  console.log(`[SPM] Anti-flicker style removed`)

}