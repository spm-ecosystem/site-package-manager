// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { updateShadowStyleTags } from '../src/content/index.iife';
import { runModernizer, SiteManifest } from '../src/content/modernizer';

describe('Hot Reloading and WebSocket Error handling', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('should update shadow root style tags correctly for :host and general styles', () => {
    const host = document.createElement('div');
    host.className = 'modern-host-test';
    document.body.appendChild(host);
    const shadowRoot = host.attachShadow({ mode: 'open' });

    const hostStyle = document.createElement('style');
    hostStyle.setAttribute('data-spm-vars', 'true');
    hostStyle.textContent = ':host { --spm-bg-primary: #000; }';
    shadowRoot.appendChild(hostStyle);

    const mainStyle = document.createElement('style');
    mainStyle.textContent = 'body { color: red; }';
    shadowRoot.appendChild(mainStyle);

    const cssVarsString = '--spm-bg-primary: #fff;';
    const newCss = 'body { color: blue; }';
    const stylesText = '/* base */';

    updateShadowStyleTags(cssVarsString, newCss, stylesText);

    expect(hostStyle.textContent).toContain('--spm-bg-primary: #fff;');
    expect(mainStyle.textContent).toContain('/* base */');
    expect(mainStyle.textContent).toContain(newCss);
  });

  it('should detect layout changes based on components and reconstructs comparison', () => {
    const manifestA = {
      components: [{ name: 'Nav', selector: '#nav', action: 'replace' as const, propsMap: {} }],
      reconstructs: []
    };
    const manifestB = {
      components: [{ name: 'Nav', selector: '#nav', action: 'replace' as const, propsMap: {} }],
      reconstructs: []
    };
    const manifestC = {
      components: [{ name: 'Footer', selector: '#footer', action: 'replace' as const, propsMap: {} }],
      reconstructs: []
    };

    const isSameAB = JSON.stringify(manifestA.components) === JSON.stringify(manifestB.components) &&
                     JSON.stringify(manifestA.reconstructs) === JSON.stringify(manifestB.reconstructs);
    expect(isSameAB).toBe(true);

    const isSameAC = JSON.stringify(manifestA.components) === JSON.stringify(manifestC.components) &&
                     JSON.stringify(manifestA.reconstructs) === JSON.stringify(manifestC.reconstructs);
    expect(isSameAC).toBe(false);
  });

  it('should append custom theme CSS to shadow root style tags when runModernizer is called', () => {
    const targetEl = document.createElement('div');
    targetEl.id = 'target-header';
    document.body.appendChild(targetEl);

    const manifest: SiteManifest = {
      components: [
        {
          name: 'UiNavHeader',
          selector: '#target-header',
          action: 'replace',
          propsMap: {},
        },
      ],
    };

    const baseCss = '.base-style { color: black; }';
    const customCss = '.custom-theme-override { background: gold; }';

    runModernizer(document, manifest, baseCss, customCss);

    const hostEl = document.querySelector('.modern-host-uinavheader');
    expect(hostEl).not.toBeNull();
    expect(hostEl?.shadowRoot).not.toBeNull();

    const styleTag = hostEl!.shadowRoot!.querySelector('style:not([data-spm-vars])');
    expect(styleTag).not.toBeNull();
    expect(styleTag!.textContent).toContain(baseCss);
    expect(styleTag!.textContent).toContain('/* Custom Theme Styles */');
    expect(styleTag!.textContent).toContain(customCss);
  });

  it('should preserve base CSS and append custom CSS when updateShadowStyleTags is called', () => {
    const host = document.createElement('div');
    host.className = 'modern-host-test';
    document.body.appendChild(host);
    const shadowRoot = host.attachShadow({ mode: 'open' });

    const mainStyle = document.createElement('style');
    mainStyle.textContent = '.initial-style { color: green; }';
    shadowRoot.appendChild(mainStyle);

    const customCss = '.custom-updated-style { color: red; }';

    updateShadowStyleTags('', customCss, '.initial-style { color: green; }');

    expect(mainStyle.textContent).toContain('.initial-style { color: green; }');
    expect(mainStyle.textContent).toContain('/* Custom Theme Styles */');
    expect(mainStyle.textContent).toContain(customCss);
  });
});
