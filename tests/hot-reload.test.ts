// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { updateShadowStyleTags } from '../src/content/index.iife';

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
    expect(mainStyle.textContent).toBe('/* base */\nbody { color: blue; }');
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
});
