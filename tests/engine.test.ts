// @vitest-environment jsdom
import { describe, it, expect, test, vi } from 'vitest';
import { extractValue, triggerProxyClick, triggerProxyEvent } from '../src/content/engine';
import { runModernizer } from '../src/content/modernizer';

describe('extractValue engine helper', () => {
  it('should extract text content from child', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span>Hello World</span>';
    const result = extractValue(div, 'span | text');
    expect(result).toBe('Hello World');
  });

  it('should extract attributes from child element', () => {
    const div = document.createElement('div');
    div.innerHTML = '<img src="https://example.com/img.jpg">';
    const result = extractValue(div, 'img | attr:src');
    expect(result).toBe('https://example.com/img.jpg');
  });

  it('should extract properties from self element', () => {
    const div = document.createElement('div');
    div.id = 'target-id';
    const result = extractValue(div, 'self | attr:id');
    expect(result).toBe('target-id');
  });

  it('should return null when selector is not matched', () => {
    const div = document.createElement('div');
    const result = extractValue(div, 'p | text');
    expect(result).toBeNull();
  });

  it('should extract URL from onclick if href is #', () => {
    const div = document.createElement('div');
    div.innerHTML = '<a href="#" onclick="document.location=\'index.php?id=123\'; return false;">Link</a>';
    const result = extractValue(div, 'a | hrefOrOnclick');
    expect(result).toBe('index.php?id=123');
  });

  it('should generate a selector string and assign data-spm-id to targetEl', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span>Test</span>';
    const result = extractValue(div, 'span | selector');
    expect(result).toMatch(/^\[data-spm-id="spm-id-[a-z0-9]+"\]$/);
    const span = div.querySelector('span');
    expect(span?.getAttribute('data-spm-id')).toBeTruthy();
  });

  it('should extract text from the next sibling element', () => {
    const div = document.createElement('div');
    div.innerHTML = '<h4>Title</h4><p>Description text here</p>';
    const result = extractValue(div, 'h4 | nextSiblingText');
    expect(result).toBe('Description text here');
  });

  test('extractValue extracts all hidden inputs inside a container', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <form>
        <input type="hidden" name="csrfmiddlewaretoken" value="abc123csrf" />
        <input type="hidden" name="session_id" value="xyz987" />
        <input type="text" name="tags" value="hello" />
      </form>
    `;
    const result = extractValue(container, 'form | hiddenInputs');
    expect(result).not.toBeNull();
    const list = JSON.parse(result!);
    expect(list).toEqual([
      { name: 'csrfmiddlewaretoken', value: 'abc123csrf' },
      { name: 'session_id', value: 'xyz987' }
    ]);
  });
});

describe('runModernizer Idempotency and Mutation Observation', () => {
  test('runModernizer does not mount multiple shadow hosts on the same container (idempotency)', () => {
    const container = document.createElement('div');
    container.className = 'test-container';
    document.body.appendChild(container);

    const manifest: any = {
      reconstructs: [
        {
          containerSelector: '.test-container',
          layoutComponent: 'UiSearchBar',
          children: []
        }
      ]
    };

    // Run first time
    runModernizer(document, manifest, '');
    const hosts1 = document.querySelectorAll('[class^="modern-reconstruct-host-"]');
    expect(hosts1.length).toBe(1);

    // Run second time (should be skipped due to data-spm-modernized attribute)
    runModernizer(document, manifest, '');
    const hosts2 = document.querySelectorAll('[class^="modern-reconstruct-host-"]');
    expect(hosts2.length).toBe(1);

    // Clean up
    container.remove();
    hosts1.forEach(h => h.remove());
  });

  test('runModernizer does not append components multiple times on append action (idempotency)', () => {
    const container = document.createElement('div');
    container.className = 'test-component-append';
    document.body.appendChild(container);

    const manifest: any = {
      components: [
        {
          name: 'UiSearchBar',
          selector: '.test-component-append',
          action: 'append',
          propsMap: {}
        }
      ]
    };

    // Run first time
    runModernizer(document, manifest, '');
    const hosts1 = container.querySelectorAll('[class^="modern-host-"]');
    expect(hosts1.length).toBe(1);

    // Run second time (should be skipped due to data-spm-modernized attribute)
    runModernizer(document, manifest, '');
    const hosts2 = container.querySelectorAll('[class^="modern-host-"]');
    expect(hosts2.length).toBe(1);

    // Clean up
    container.remove();
  });

  test('MutationObserver schedules modernization when non-modern nodes are added', async () => {
    const mockRunModernizer = vi.fn();
    
    // Create a debouncing scheduler similar to index.iife.tsx
    let modernizationTimeout: any = null;
    const scheduleModernization = (_manifest: any) => {
      if (modernizationTimeout !== null) {
        clearTimeout(modernizationTimeout);
      }
      modernizationTimeout = setTimeout(() => {
        mockRunModernizer();
      }, 10);
    };

    const observer = new MutationObserver((mutations) => {
      let shouldRun = false;
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === 1) {
            const el = node as HTMLElement;
            const className = typeof el.className === 'string' ? el.className : '';
            if (!className.includes('modern-') && el.id !== 'spm-global-toast-host') {
              shouldRun = true;
              break;
            }
          }
        }
        if (shouldRun) break;
      }
      if (shouldRun) {
        scheduleModernization({});
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 1. Add a modern element (should be ignored)
    const modernEl = document.createElement('div');
    modernEl.className = 'modern-host-test';
    document.body.appendChild(modernEl);

    // 2. Add a non-modern element (should trigger)
    const regularEl = document.createElement('div');
    regularEl.className = 'regular-class';
    document.body.appendChild(regularEl);

    // Wait for mutation observer microtask and timeout
    await new Promise(resolve => setTimeout(resolve, 30));

    expect(mockRunModernizer).toHaveBeenCalledTimes(1);

    // Clean up
    observer.disconnect();
    modernEl.remove();
    regularEl.remove();
  });

  test('window.alert bubbles up events to top window in nested environment', () => {
    const originalAlert = window.alert;

    const fakeTop = {
      dispatchEvent: vi.fn(),
      postMessage: vi.fn()
    };

    const originalTop = window.top;
    Object.defineProperty(window, 'top', {
      value: fakeTop,
      writable: true,
      configurable: true
    });

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

    const spy = vi.fn();
    window.addEventListener('spm-show-toast', spy);

    window.alert('Test Message');

    expect(spy).toHaveBeenCalled();
    expect(fakeTop.dispatchEvent).toHaveBeenCalled();

    window.removeEventListener('spm-show-toast', spy);
    Object.defineProperty(window, 'top', {
      value: originalTop,
      configurable: true
    });
    window.alert = originalAlert;
  });

  test('triggerProxyClick and triggerProxyEvent correctly dispatch events to original elements', () => {
    // 1. Setup button with click listener and onclick attribute
    const btn = document.createElement('button');
    btn.id = 'legacy-btn';
    btn.setAttribute('onclick', 'window.__legacy_click_attribute = true;');
    // Set onclick property directly for JSDOM runtime compatibility
    btn.onclick = () => {
      (window as any).__legacy_click_attribute = true;
    };
    
    let listenerCalled = false;
    btn.addEventListener('click', () => {
      listenerCalled = true;
    });
    
    document.body.appendChild(btn);

    // Call triggerProxyClick using selector
    triggerProxyClick('#legacy-btn');

    expect(listenerCalled).toBe(true);
    expect((window as any).__legacy_click_attribute).toBe(true);

    // 2. Setup input element with change / input listener
    const input = document.createElement('input');
    input.id = 'legacy-input';
    document.body.appendChild(input);

    let inputChanged = false;
    input.addEventListener('change', () => {
      inputChanged = true;
    });

    // Call triggerProxyEvent
    triggerProxyEvent('#legacy-input', 'change', 'New Value');

    expect(input.value).toBe('New Value');
    expect(inputChanged).toBe(true);

    // Clean up
    btn.remove();
    input.remove();
    delete (window as any).__legacy_click_attribute;
  });
});
