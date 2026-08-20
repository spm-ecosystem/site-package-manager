export function extractValue(element: Element, queryRule: string): string | null {
  const parts = queryRule.split('|').map((s) => s.trim());
  const selector = parts[0];
  const extractor = parts[1];

  if (!selector || !extractor) return null;

  const targetEl = selector === 'self' ? element : element.querySelector(selector);
  if (!targetEl) return null;

  let val: string | null = null;

  if (extractor.startsWith('attr:')) {
    const attrName = extractor.substring(5);
    val = targetEl.getAttribute(attrName);
  } else if (extractor === 'text') {
    val = targetEl.textContent;
  } else if (extractor === 'html') {
    val = targetEl.innerHTML;
  } else if (extractor === 'hrefOrOnclick') {
    const href = targetEl.getAttribute('href');
    if (href && href !== '#' && !href.startsWith('javascript:')) {
      val = href;
    } else {
      const onclick = targetEl.getAttribute('onclick') || '';
      const match = onclick.match(/(?:document|window)\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i) || onclick.match(/document\.location\s*=\s*['"]([^'"]+)['"]/i);
      if (match) {
        val = match[1];
      } else {
        val = href || null;
      }
    }
  } else if (extractor === 'selector') {
    let spmId = targetEl.getAttribute('data-spm-id');
    if (!spmId) {
      spmId = 'spm-id-' + Math.random().toString(36).substring(2, 9);
      targetEl.setAttribute('data-spm-id', spmId);
    }
    val = `[data-spm-id="${spmId}"]`;
  } else if (extractor === 'nextSiblingText') {
    const next = targetEl.nextElementSibling;
    val = next ? next.textContent : null;
  } else if (extractor === 'hiddenInputs') {
    const inputs = targetEl.querySelectorAll('input[type="hidden"]');
    const list: { name: string; value: string }[] = [];
    inputs.forEach((input) => {
      const name = input.getAttribute('name');
      const value = input.getAttribute('value') || '';
      if (name) {
        list.push({ name, value });
      }
    });
    val = JSON.stringify(list);
  }

  // Process subsequent pipes
  for (let i = 2; i < parts.length; i++) {
    const pipe = parts[i];
    if (pipe === 'number') {
      if (val === null || val === undefined || val.trim() === '') {
        val = null;
        continue;
      }
      const numVal = Number(val.trim());
      if (isNaN(numVal)) {
        val = null;
      } else {
        val = String(numVal);
      }
    } else if (pipe === 'cleanNumber') {
      if (val === null || val === undefined || val.trim() === '') {
        val = null;
        continue;
      }
      const cleaned = val
        .replace(/[, \s]/g, '')
        .replace(/[^0-9.-]/g, '');
      const numVal = parseFloat(cleaned);
      if (isNaN(numVal)) {
        val = null;
      } else {
        val = String(numVal);
      }
    }
  }

  return val;
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

  // 2. Trigger click with mouse event to support listeners + standard click
  const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
  originalEl.dispatchEvent(clickEvent);
  if (originalEl instanceof HTMLElement) {
    originalEl.click();
  }

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
          const forceClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
          originalEl.dispatchEvent(forceClickEvent);
          if (originalEl instanceof HTMLElement) {
            originalEl.click();
          }
          // Reset to idle
          window.dispatchEvent(new CustomEvent('spm-set-confirm-mode', { detail: { mode: 'idle' } }));
        }
      }
    }));
  }
}

export function triggerProxyEvent(targetSelector: string, eventName: string, value?: string) {
  const originalEl = document.querySelector(targetSelector);
  if (!originalEl) return;

  if (originalEl instanceof HTMLInputElement || originalEl instanceof HTMLTextAreaElement || originalEl instanceof HTMLSelectElement) {
    if (value !== undefined) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(originalEl),
        'value'
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(originalEl, value);
      } else {
        originalEl.value = value;
      }
    }
  }

  let event: Event;
  if (['click', 'mousedown', 'mouseup'].includes(eventName)) {
    event = new MouseEvent(eventName, { bubbles: true, cancelable: true });
  } else if (['keydown', 'keyup', 'keypress'].includes(eventName)) {
    event = new KeyboardEvent(eventName, { bubbles: true, cancelable: true });
  } else {
    event = new Event(eventName, { bubbles: true, cancelable: true });
  }
  originalEl.dispatchEvent(event);
}

export function revealPage() {
  setTimeout(() => {
    const antiFlickerStyle = document.getElementById('spm-anti-flicker');
    const loadingOverlay   = document.getElementById('spm-loading-overlay');

    if(!antiFlickerStyle) return;

    console.log("[SPM] revealPage called")

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
      loadingOverlay?.remove();
      console.log(`[SPM] Anti-flicker style removed`)
    }, 200);
  }, 50)


}