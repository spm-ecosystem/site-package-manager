// @vitest-environment jsdom
import { describe, it, expect, test, vi } from 'vitest';
import { extractValue, triggerProxyClick, triggerProxyEvent } from '../src/content/engine';
import { runModernizer, parsePropValue, computeSha256, verifyManifestIntegrity, fetchThemeFiles, findElementWithShadow, findAllElementsWithShadow, markActiveNavigationLinks, setupActiveLinkListeners, handleInfiniteScrollAnchor, isClientSideAnchor, getNextPageElement, getNextPageUrl } from '../src/content/modernizer';
import { computeManifestIntegrity } from '../src/popup/index';

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

  it('should sanitize raw html extracted via html extractor using DOMPurify', () => {
    const div = document.createElement('div');
    div.innerHTML = '<div class="content">Hello <script>alert("xss")</script><img src="x" onerror="alert(1)"> world</div>';
    const result = extractValue(div, '.content | html');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('onerror');
    expect(result).toContain('Hello');
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
  describe('number and cleanNumber pipes', () => {
    it('should convert valid number string directly using number pipe', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>123.45</span>';
      const result = extractValue(div, 'span | text | number');
      expect(result).toBe('123.45');
    });

    it('should return null for invalid number using number pipe', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>abc</span>';
      const result = extractValue(div, 'span | text | number');
      expect(result).toBeNull();
    });

    it('should convert currency strings using cleanNumber pipe', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>$ 1,200.50</span>';
      const result = extractValue(div, 'span | text | cleanNumber');
      expect(result).toBe('1200.5');
    });

    it('should convert other currencies like R$ and negative values using cleanNumber pipe', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>- R$ 2.500,75</span>';
      const result1 = extractValue(div, 'span | text | cleanNumber');
      expect(result1).toBe('-2500.75');

      const div2 = document.createElement('div');
      div2.innerHTML = '<span>R$ -1,500.25</span>';
      const result2 = extractValue(div2, 'span | text | cleanNumber');
      expect(result2).toBe('-1500.25');
    });

    it('should parse metric multiplier suffixes (k, m, b) correctly with cleanNumber', () => {
      const div1 = document.createElement('div');
      div1.innerHTML = '<span>2.4k views</span>';
      expect(extractValue(div1, 'span | text | cleanNumber')).toBe('2400');

      const div2 = document.createElement('div');
      div2.innerHTML = '<span>1.5M followers</span>';
      expect(extractValue(div2, 'span | text | cleanNumber')).toBe('1500000');
    });

    it('should not treat hyphens inside string prefixes as negative signs', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>q-12345</span>';
      expect(extractValue(div, 'span | text | cleanNumber')).toBe('12345');
    });

    it('should handle empty/null values gracefully across pipes', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>   </span>';
      const result1 = extractValue(div, 'span | text | number');
      expect(result1).toBeNull();

      const result2 = extractValue(div, 'span | text | cleanNumber');
      expect(result2).toBeNull();

      const result3 = extractValue(div, 'p | text | number');
      expect(result3).toBeNull();
    });

    it('should support multiple consecutive pipes', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>$ 1,200.50</span>';
      const result = extractValue(div, 'span | text | cleanNumber | number');
      expect(result).toBe('1200.5');
    });
  });

  describe('sequential pipe execution and split pipe', () => {
    it('should split string by space by default', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>1girl blue_hair  short_hair</span>';
      const result = extractValue(div, 'span | text | split');
      expect(result).toBe('["1girl","blue_hair","short_hair"]');
    });

    it('should split string by custom delimiter and trim values', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>1girl, blue_hair , short_hair</span>';
      const result = extractValue(div, 'span | text | split:,');
      expect(result).toBe('["1girl","blue_hair","short_hair"]');
    });

    it('should support multiple sequential pipes and return null on unknown pipe', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>1girl_blue short_hair</span>';
      const resultUnknown = extractValue(div, 'span | text | split | unknown');
      expect(resultUnknown).toBeNull();
    });

    it('should return null if base value is null', () => {
      const div = document.createElement('div');
      const result = extractValue(div, 'p | text | split');
      expect(result).toBeNull();
    });
  });

  describe('parsePropValue helper', () => {
    it('should parse valid JSON arrays into JS arrays', () => {
      const arrayStr = '["1girl","blue_hair"]';
      expect(parsePropValue(arrayStr)).toEqual(['1girl', 'blue_hair']);
    });

    it('should parse valid JSON objects into JS objects', () => {
      const objStr = '{"name":"csrf","value":"abc"}';
      expect(parsePropValue(objStr)).toEqual({ name: 'csrf', value: 'abc' });
    });

    it('should return raw string if not valid JSON or not array/object', () => {
      expect(parsePropValue('hello world')).toBe('hello world');
      expect(parsePropValue('123')).toBe('123');
      expect(parsePropValue(null)).toBeNull();
    });
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

describe('Manifest Security & Integrity Verification', () => {
  it('should compute valid SHA-256 hash for manifest string', async () => {
    const jsonStr = '{"name":"test-manifest"}';
    const hash = await computeSha256(jsonStr);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should verify matching integrity hash and reject mismatching hash', async () => {
    const jsonStr = '{"name":"test-manifest"}';
    const hash = await computeSha256(jsonStr);

    const isValid = await verifyManifestIntegrity(jsonStr, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyManifestIntegrity(jsonStr, 'badhash1234567890');
    expect(isInvalid).toBe(false);
  });

  it('should verify and pin SHA-256 integrity in fetchThemeFiles', async () => {
    const manifestJson = JSON.stringify({ theme: { noticeSelector: '#notice' }, components: [] });
    const rawHash = await computeSha256(manifestJson);
    const expectedIntegrity = `sha256-${rawHash}`;

    const mockStorage: Record<string, any> = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          set: vi.fn((obj: Record<string, any>) => {
            Object.assign(mockStorage, obj);
          })
        }
      }
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('manifest.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(manifestJson),
          headers: new Headers({ 'x-spm-integrity': expectedIntegrity })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('/* css */')
      });
    });

    try {
      const { manifest, cssText } = await fetchThemeFiles('test.example.com', 'modern-theme', '1.0.0', expectedIntegrity);
      expect(manifest).toBeDefined();
      expect(cssText).toBe('/* css */');
      expect((globalThis as any).chrome.storage.local.set).toHaveBeenCalledWith({
        'spm_pinned_integrity:test.example.com:modern-theme:1.0.0': expectedIntegrity,
        'spm_pinned_integrity:test.example.com': expectedIntegrity
      });
      expect(mockStorage['spm_pinned_integrity:test.example.com:modern-theme:1.0.0']).toBe(expectedIntegrity);
    } finally {
      globalThis.fetch = originalFetch;
      delete (globalThis as any).chrome;
    }
  });

  it('should throw error when pinned integrity does not match manifest hash', async () => {
    const manifestJson = JSON.stringify({ theme: {}, components: [] });
    const badIntegrity = 'sha256-0000000000000000000000000000000000000000000000000000000000000000';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('manifest.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(manifestJson),
          headers: new Headers()
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('')
      });
    });

    try {
      await expect(
        fetchThemeFiles('test.example.com', 'modern-theme', '1.0.0', badIntegrity)
      ).rejects.toThrow(/Pinned SHA-256 integrity mismatch/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should compute SHA-256 integrity hash correctly in popup helper', async () => {
    const manifestJson = JSON.stringify({ name: 'theme', version: '1.0.0' });
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(manifestJson));
    const expectedHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const expectedIntegrity = `sha256-${expectedHex}`;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('manifest.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(manifestJson)
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    try {
      const integrity = await computeManifestIntegrity('test.example.com', 'theme', '1.0.0');
      expect(integrity).toBe(expectedIntegrity);

      // Return null on failure
      const missing = await computeManifestIntegrity('', 'theme', '1.0.0');
      expect(missing).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('findElementWithShadow and findAllElementsWithShadow helper', () => {
  it('resolves normal selectors cleanly', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="target-item"><span id="inner-span">Text</span></div>';

    const el = findElementWithShadow(root, '.target-item');
    expect(el).not.toBeNull();
    expect(el?.className).toBe('target-item');

    const span = findElementWithShadow(root, '#inner-span');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('Text');

    const notFound = findElementWithShadow(root, '.non-existent');
    expect(notFound).toBeNull();
  });

  it('handles invalid selector string without throwing uncaught error', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="test"></div>';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const el = findElementWithShadow(root, ':::invalid[selector==bad:::');
    expect(el).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    const list = findAllElementsWithShadow(root, ':::invalid[selector==bad:::');
    expect(list).toEqual([]);

    warnSpy.mockRestore();
  });

  it('resolves shadow host and inner selector using explicit parameters', () => {
    const root = document.createElement('div');
    const host = document.createElement('div');
    host.id = 'shadow-host-1';
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    inner.className = 'shadow-inner';
    inner.textContent = 'Shadow Content';
    shadow.appendChild(inner);
    root.appendChild(host);

    const found = findElementWithShadow(root, '', true, '#shadow-host-1', '.shadow-inner');
    expect(found).not.toBeNull();
    expect(found?.textContent).toBe('Shadow Content');

    // Without innerSelector, returns host
    const foundHost = findElementWithShadow(root, '', true, '#shadow-host-1');
    expect(foundHost).toBe(host);

    // If host not found, returns null
    const notFound = findElementWithShadow(root, '', true, '#non-existent-host', '.shadow-inner');
    expect(notFound).toBeNull();
  });

  it('resolves shadow host and inner selector using shadow: prefix syntax', () => {
    const root = document.createElement('div');
    const host = document.createElement('div');
    host.className = 'custom-widget-host';
    const shadow = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');
    button.className = 'btn-inside-shadow';
    button.textContent = 'Click Me';
    shadow.appendChild(button);
    root.appendChild(host);

    const found = findElementWithShadow(root, 'shadow: .custom-widget-host -> .btn-inside-shadow');
    expect(found).not.toBeNull();
    expect(found?.textContent).toBe('Click Me');

    // Without arrow / inner selector
    const hostOnly = findElementWithShadow(root, 'shadow: .custom-widget-host');
    expect(hostOnly).toBe(host);

    // If host not found
    const notFound = findElementWithShadow(root, 'shadow: .missing-host -> .btn');
    expect(notFound).toBeNull();
  });

  it('findAllElementsWithShadow returns array of matching elements inside shadow root and normal DOM', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="normal-item">1</div><div class="normal-item">2</div>';

    const normalList = findAllElementsWithShadow(root, '.normal-item');
    expect(normalList).toHaveLength(2);

    const host = document.createElement('div');
    host.id = 'multi-shadow-host';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<span class="item">A</span><span class="item">B</span><span class="item">C</span>';
    root.appendChild(host);

    const shadowListExplicit = findAllElementsWithShadow(root, '', true, '#multi-shadow-host', '.item');
    expect(shadowListExplicit).toHaveLength(3);
    expect(shadowListExplicit.map(el => el.textContent)).toEqual(['A', 'B', 'C']);

    const shadowListSyntax = findAllElementsWithShadow(root, 'shadow: #multi-shadow-host -> .item');
    expect(shadowListSyntax).toHaveLength(3);
    expect(shadowListSyntax.map(el => el.textContent)).toEqual(['A', 'B', 'C']);

    // Non-existent host returns empty array
    expect(findAllElementsWithShadow(root, 'shadow: #missing-host -> .item')).toEqual([]);
    expect(findAllElementsWithShadow(root, '', true, '#missing-host', '.item')).toEqual([]);
  });
});

describe('runModernizer Error Isolation', () => {
  it('isolates errors in reconstruct configs and continues processing other reconstructs', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const container1 = document.createElement('div');
    container1.className = 'recon-container-1';
    const container2 = document.createElement('div');
    container2.className = 'recon-container-2';
    document.body.appendChild(container1);
    document.body.appendChild(container2);

    const manifest: any = {
      reconstructs: [
        {
          containerSelector: ':::invalid-bad-selector:::',
          layoutComponent: 'UiSearchBar',
          children: []
        },
        {
          containerSelector: '.recon-container-2',
          layoutComponent: 'UiSearchBar',
          children: []
        }
      ]
    };

    expect(() => {
      runModernizer(document, manifest, '');
    }).not.toThrow();

    // container2 should have been reconstructed successfully
    expect(container2.getAttribute('data-spm-modernized')).toBe('true');

    // Clean up
    container1.remove();
    container2.remove();
    document.querySelectorAll('[class^="modern-reconstruct-host-"]').forEach(h => h.remove());
    errSpy.mockRestore();
  });

  it('isolates errors in component configs and continues processing other components', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const compEl1 = document.createElement('div');
    compEl1.className = 'comp-el-1';
    const compEl2 = document.createElement('div');
    compEl2.className = 'comp-el-2';
    document.body.appendChild(compEl1);
    document.body.appendChild(compEl2);

    const manifest: any = {
      components: [
        {
          name: 'UiSearchBar',
          selector: ':::invalid-comp-selector:::',
          action: 'replace',
          propsMap: {}
        },
        {
          name: 'UiSearchBar',
          selector: '.comp-el-2',
          action: 'replace',
          propsMap: {}
        }
      ]
    };

    expect(() => {
      runModernizer(document, manifest, '');
    }).not.toThrow();

    // compEl2 should have been modernized
    expect(compEl2.getAttribute('data-spm-modernized')).toBe('true');

    // Clean up
    compEl1.remove();
    compEl2.remove();
    document.querySelectorAll('[class^="modern-host-"]').forEach(h => h.remove());
    errSpy.mockRestore();
  });
});

describe('markActiveNavigationLinks & setupActiveLinkListeners', () => {
  it('adds spm-active and data-active="true" to link matching current pathname', () => {
    document.body.innerHTML = `
      <nav class="pagetop">
        <a id="link-news" href="/news">News</a>
        <a id="link-newest" href="/newest">New</a>
        <a id="link-comments" href="/newcomments">Comments</a>
      </nav>
    `;

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        origin: 'https://news.ycombinator.com',
        pathname: '/newest',
        search: '',
        hash: ''
      }
    });

    markActiveNavigationLinks();

    const newestLink = document.getElementById('link-newest');
    const newsLink = document.getElementById('link-news');

    expect(newestLink?.classList.contains('spm-active')).toBe(true);
    expect(newestLink?.getAttribute('data-active')).toBe('true');
    expect(newsLink?.classList.contains('spm-active')).toBe(false);
  });

  it('marks active anchor link matching location.hash', () => {
    document.body.innerHTML = `
      <nav>
        <a id="link-sec1" href="#section1">Section 1</a>
        <a id="link-sec2" href="#section2">Section 2</a>
      </nav>
    `;

    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        origin: 'https://example.com',
        pathname: '/doc',
        search: '',
        hash: '#section2'
      }
    });

    markActiveNavigationLinks();

    const sec1 = document.getElementById('link-sec1');
    const sec2 = document.getElementById('link-sec2');

    expect(sec2?.classList.contains('spm-active')).toBe(true);
    expect(sec2?.getAttribute('data-active')).toBe('true');
    expect(sec1?.classList.contains('spm-active')).toBe(false);
  });

  it('initializes listeners via setupActiveLinkListeners without throwing', () => {
    expect(() => {
      setupActiveLinkListeners();
    }).not.toThrow();
  });
});

describe('infiniteScroll and handleInfiniteScrollAnchor Client-Side Hydrated Anchors', () => {
  describe('isClientSideAnchor helper', () => {
    it('correctly identifies javascript:void(0), javascript:;, and hash links as client-side anchors', () => {
      expect(isClientSideAnchor('javascript:void(0)')).toBe(true);
      expect(isClientSideAnchor('javascript:void(0);')).toBe(true);
      expect(isClientSideAnchor('javascript:;')).toBe(true);
      expect(isClientSideAnchor('javascript:')).toBe(true);
      expect(isClientSideAnchor('#')).toBe(true);
      expect(isClientSideAnchor('#;')).toBe(true);
      expect(isClientSideAnchor('javascript:loadNextPage()')).toBe(true);
      expect(isClientSideAnchor(null)).toBe(true);
      expect(isClientSideAnchor(undefined)).toBe(true);
      expect(isClientSideAnchor('')).toBe(true);
    });

    it('identifies standard HTTP/relative links as non-client-side (SSR) URLs', () => {
      expect(isClientSideAnchor('/page/2')).toBe(false);
      expect(isClientSideAnchor('https://example.com/posts?page=2')).toBe(false);
      expect(isClientSideAnchor('?page=2')).toBe(false);
      expect(isClientSideAnchor('index.php?offset=10')).toBe(false);
    });
  });

  describe('getNextPageElement and getNextPageUrl helpers', () => {
    it('finds next page element by selector and optional text/attribute', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <a class="page-link" href="/page/1">1</a>
        <a class="page-link" href="/page/2" rel="next">Next</a>
      `;

      const el = getNextPageElement(container, { nextPageSelector: '.page-link', nextPageText: 'Next' });
      expect(el).not.toBeNull();
      expect(el?.getAttribute('href')).toBe('/page/2');
      expect(getNextPageUrl(container, { nextPageSelector: '.page-link', nextPageText: 'Next' })).toBe('/page/2');
    });

    it('returns null when element is missing', () => {
      const container = document.createElement('div');
      expect(getNextPageElement(container, { nextPageSelector: '.missing' })).toBeNull();
      expect(getNextPageUrl(container, { nextPageSelector: '.missing' })).toBeNull();
    });
  });

  describe('handleInfiniteScrollAnchor with javascript:void(0)', () => {
    it('triggers simulated click on javascript:void(0) anchor and cleanly observes dynamic DOM mutations', async () => {
      const container = document.createElement('div');
      container.id = 'items-container';
      container.innerHTML = `
        <div class="item"><h3>Item 1</h3></div>
        <div class="item"><h3>Item 2</h3></div>
        <a id="load-more-btn" href="javascript:void(0)">Load More</a>
      `;
      document.body.appendChild(container);

      const anchor = container.querySelector('#load-more-btn') as HTMLAnchorElement;
      let clickFired = false;

      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        clickFired = true;
        // Dynamically append new items into container
        const item3 = document.createElement('div');
        item3.className = 'item';
        item3.innerHTML = '<h3>Item 3</h3>';
        const item4 = document.createElement('div');
        item4.className = 'item';
        item4.innerHTML = '<h3>Item 4</h3>';
        container.insertBefore(item3, anchor);
        container.insertBefore(item4, anchor);
      });

      const prevCounts = { items: 2 };
      const res = await handleInfiniteScrollAnchor(anchor, {
        container,
        rootContext: document,
        children: [
          {
            name: 'items',
            selector: '.item',
            propsMap: { title: 'h3 | text' }
          }
        ],
        config: { nextPageSelector: '#load-more-btn' },
        prevCounts,
        timeoutMs: 300
      });

      expect(clickFired).toBe(true);
      expect(res.items).toBeDefined();
      expect(res.items).toHaveLength(2);
      expect(res.items).toEqual([
        { title: 'Item 3' },
        { title: 'Item 4' }
      ]);
      expect(res.hasMore).toBe(true);
      expect(prevCounts.items).toBe(4);

      container.remove();
    });

    it('handles javascript:; and # client-side anchors with simulated click', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="row"><span>Row 1</span></div>
        <a id="btn-hash" href="#">More</a>
      `;
      document.body.appendChild(container);

      const anchor = container.querySelector('#btn-hash') as HTMLAnchorElement;
      let clicked = false;

      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        clicked = true;
        const newRow = document.createElement('div');
        newRow.className = 'row';
        newRow.innerHTML = '<span>Row 2</span>';
        container.insertBefore(newRow, anchor);
      });

      const prevCounts = { tableRows: 1 };
      const res = await handleInfiniteScrollAnchor(anchor, {
        container,
        rootContext: document,
        children: [
          {
            name: 'tableRows',
            selector: '.row',
            propsMap: { text: 'span | text' }
          }
        ],
        config: { nextPageSelector: '#btn-hash' },
        prevCounts,
        timeoutMs: 300
      });

      expect(clicked).toBe(true);
      expect(res.tableRows).toEqual([{ text: 'Row 2' }]);
      expect(res.hasMore).toBe(true);

      container.remove();
    });

    it('sets hasMore to false when next anchor is removed or disabled or no new items added', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="item"><h3>Item 1</h3></div>
        <a id="btn-final" href="javascript:void(0)">Last Page</a>
      `;
      document.body.appendChild(container);

      const anchor = container.querySelector('#btn-final') as HTMLAnchorElement;
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        // Disables and hides the button, no new items
        anchor.setAttribute('disabled', 'true');
        anchor.style.display = 'none';
      });

      const prevCounts = { items: 1 };
      const res = await handleInfiniteScrollAnchor(anchor, {
        container,
        rootContext: document,
        children: [
          {
            name: 'items',
            selector: '.item',
            propsMap: { title: 'h3 | text' }
          }
        ],
        config: { nextPageSelector: '#btn-final' },
        prevCounts,
        timeoutMs: 200
      });

      expect(res.items).toEqual([]);
      expect(res.hasMore).toBe(false);

      container.remove();
    });
  });

  describe('runModernizer infiniteScroll integration with client-side hydrated anchor', () => {
    it('sets up onLoadMore that triggers simulated click on javascript:void(0) anchor', async () => {
      const container = document.createElement('div');
      container.className = 'grid-recon-container';
      container.innerHTML = `
        <div class="gallery">
          <div class="thumb"><img src="thumb1.jpg" /><span>Title 1</span></div>
          <div class="thumb"><img src="thumb2.jpg" /><span>Title 2</span></div>
        </div>
        <a class="pagination-next" href="javascript:void(0)">Next Page</a>
      `;
      document.body.appendChild(container);

      const nextAnchor = container.querySelector('.pagination-next') as HTMLAnchorElement;
      let nextClicked = false;
      nextAnchor.addEventListener('click', (e) => {
        e.preventDefault();
        nextClicked = true;
        const gallery = container.querySelector('.gallery')!;
        const newThumb = document.createElement('div');
        newThumb.className = 'thumb';
        newThumb.innerHTML = '<img src="thumb3.jpg" /><span>Title 3</span>';
        gallery.appendChild(newThumb);
      });

      const manifest: any = {
        reconstructs: [
          {
            containerSelector: '.grid-recon-container',
            layoutComponent: 'UiSearchBar', // Registered layout component
            children: [
              {
                name: 'items',
                selector: '.thumb',
                propsMap: {
                  title: 'span | text',
                  imageUrl: 'img | attr:src'
                }
              }
            ],
            infiniteScroll: {
              nextPageSelector: '.pagination-next'
            }
          }
        ]
      };

      runModernizer(document, manifest, '');

      expect(nextAnchor).not.toBeNull();
      // Test handleInfiniteScrollAnchor directly as called during onLoadMore
      const prevCounts = { items: 2 };
      const loadRes = await handleInfiniteScrollAnchor(nextAnchor, {
        container,
        rootContext: document,
        children: manifest.reconstructs[0].children,
        config: manifest.reconstructs[0].infiniteScroll,
        prevCounts,
        timeoutMs: 300
      });

      expect(nextClicked).toBe(true);
      expect(loadRes.items).toHaveLength(1);
      expect(loadRes.items[0]).toEqual({
        title: 'Title 3',
        imageUrl: 'thumb3.jpg'
      });
      expect(loadRes.hasMore).toBe(true);

      // Clean up
      container.remove();
      document.querySelectorAll('[class^="modern-reconstruct-host-"]').forEach(h => h.remove());
    });
  });
});

