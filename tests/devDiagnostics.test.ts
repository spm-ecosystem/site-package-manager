// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DevDiagnosticCollector,
  DevDiagnosticItem,
  SpmDevDiagnosticBridge,
} from '../src/content/devDiagnostics';
import { runModernizer, SiteManifest } from '../src/content/modernizer';

const waitForUpdate = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('DevDiagnosticCollector', () => {
  beforeEach(() => {
    DevDiagnosticCollector.clear();
  });

  it('adds diagnostic items with auto-generated id, timestamp, and occurrenceCount: 1', () => {
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Missing Selector',
      message: 'Selector .missing-class did not match any elements.',
    });

    const items = DevDiagnosticCollector.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBeDefined();
    expect(typeof items[0].timestamp).toBe('number');
    expect(items[0].type).toBe('MISSING_SELECTOR');
    expect(items[0].severity).toBe('warning');
    expect(items[0].title).toBe('Missing Selector');
    expect(items[0].message).toBe('Selector .missing-class did not match any elements.');
    expect(items[0].occurrenceCount).toBe(1);
  });

  it('deduplicates identical diagnostics, updates timestamp, and increments occurrenceCount', () => {
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Missing Header',
      message: 'Header selector #main-nav not found',
      details: '{"selector": "#main-nav"}',
    });

    const firstTimestamp = DevDiagnosticCollector.getItems()[0].timestamp;
    expect(DevDiagnosticCollector.getItems()).toHaveLength(1);
    expect(DevDiagnosticCollector.getItems()[0].occurrenceCount).toBe(1);

    // Add identical diagnostic
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Missing Header',
      message: 'Header selector #main-nav not found',
      details: '{"selector": "#main-nav"}',
    });

    const items = DevDiagnosticCollector.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].timestamp).toBeGreaterThanOrEqual(firstTimestamp);
    expect(items[0].occurrenceCount).toBe(2);

    // Add another identical diagnostic
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Missing Header',
      message: 'Header selector #main-nav not found',
      details: '{"selector": "#main-nav"}',
    });

    expect(DevDiagnosticCollector.getItems()[0].occurrenceCount).toBe(3);
  });

  it('filters items by severity (warning vs error)', () => {
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Warning Title',
      message: 'A warning message',
    });

    DevDiagnosticCollector.addDiagnostic({
      type: 'BUILD_ERROR',
      severity: 'error',
      title: 'Error Title',
      message: 'An error message',
    });

    const all = DevDiagnosticCollector.getItems();
    const warnings = DevDiagnosticCollector.getItems('warning');
    const errors = DevDiagnosticCollector.getItems('error');

    expect(all).toHaveLength(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
  });

  it('clears all diagnostic items and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = DevDiagnosticCollector.subscribe(listener);

    DevDiagnosticCollector.addDiagnostic({
      type: 'INVALID_PROP',
      severity: 'warning',
      title: 'Invalid prop',
      message: 'Prop count is invalid',
    });

    expect(DevDiagnosticCollector.getItems()).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);

    DevDiagnosticCollector.clear();
    expect(DevDiagnosticCollector.getItems()).toHaveLength(0);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith([]);

    unsubscribe();
  });

  it('supports subscription listeners and unsubscription', () => {
    const listener = vi.fn();
    const unsubscribe = DevDiagnosticCollector.subscribe(listener);

    DevDiagnosticCollector.addDiagnostic({
      type: 'DEV_SERVER_DISCONNECTED',
      severity: 'error',
      title: 'Dev Server Disconnected',
      message: 'Unable to connect to ws://localhost:3000',
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const receivedItems: DevDiagnosticItem[] = listener.mock.calls[0][0];
    expect(receivedItems).toHaveLength(1);
    expect(receivedItems[0].type).toBe('DEV_SERVER_DISCONNECTED');

    // Unsubscribe and verify no more calls
    unsubscribe();

    DevDiagnosticCollector.addDiagnostic({
      type: 'BUILD_ERROR',
      severity: 'error',
      title: 'Build failed',
      message: 'Syntax error',
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('SpmDevDiagnosticBridge', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    DevDiagnosticCollector.clear();
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    DevDiagnosticCollector.clear();
  });

  it('subscribes to DevDiagnosticCollector and renders diagnostics reactively', async () => {
    const root = createRoot(container);
    root.render(React.createElement(SpmDevDiagnosticBridge, { initialExpanded: true }));
    await waitForUpdate();

    expect(container.textContent).toContain('No diagnostic issues detected.');

    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Dynamic Warning',
      message: 'Dynamically added selector issue',
    });
    await waitForUpdate();

    expect(container.textContent).toContain('Dynamic Warning');
    expect(container.textContent).toContain('All (1)');
  });

  it('clears DevDiagnosticCollector when Clear button is clicked in Bridge', async () => {
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'To Be Cleared',
      message: 'Will be deleted on clear',
    });

    const root = createRoot(container);
    root.render(React.createElement(SpmDevDiagnosticBridge, { initialExpanded: true }));
    await waitForUpdate();

    expect(container.textContent).toContain('To Be Cleared');
    expect(DevDiagnosticCollector.getItems()).toHaveLength(1);

    const clearBtn = container.querySelector('.spm-dev-diagnostic-clear-btn') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    clearBtn.click();
    await waitForUpdate();

    expect(DevDiagnosticCollector.getItems()).toHaveLength(0);
    expect(container.textContent).toContain('No diagnostic issues detected.');
  });
});

describe('modernizer dev diagnostic Shadow DOM host integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    DevDiagnosticCollector.clear();
    delete (window as any).__spm_dev_manifest;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).__spm_dev_manifest;
  });

  it('mounts #spm-dev-diagnostic-host Shadow DOM root when isDev is true', () => {
    const manifest: SiteManifest = {
      reconstructs: [
        {
          containerSelector: '#non-existent-box',
          layoutComponent: 'UiSearchBar',
          children: [],
        },
      ],
    };

    runModernizer(document, manifest, '', '', true);

    const devHost = document.getElementById('spm-dev-diagnostic-host');
    expect(devHost).toBeTruthy();
    expect(devHost?.shadowRoot).toBeTruthy();
    expect(devHost?.style.position).toBe('fixed');
    expect(devHost?.style.bottom).toBe('0px');
    expect(devHost?.style.right).toBe('0px');
    expect(devHost?.style.zIndex).toBe('999999');
  });

  it('does NOT mount #spm-dev-diagnostic-host when isDev is false and __spm_dev_manifest is absent', () => {
    const manifest: SiteManifest = {};
    runModernizer(document, manifest, '', '', false);

    const devHost = document.getElementById('spm-dev-diagnostic-host');
    expect(devHost).toBeNull();
  });

  it('mounts #spm-dev-diagnostic-host when window.__spm_dev_manifest is defined', () => {
    (window as any).__spm_dev_manifest = {
      components: [],
    };

    runModernizer(document, {}, '', '', false);

    const devHost = document.getElementById('spm-dev-diagnostic-host');
    expect(devHost).toBeTruthy();
    expect(devHost?.shadowRoot).toBeTruthy();
  });
});

describe('modernizer missing selector dev diagnostics integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    DevDiagnosticCollector.clear();
  });

  it('records MISSING_SELECTOR diagnostic when reconstruct container is not found in dev mode', () => {
    const manifest: SiteManifest = {
      reconstructs: [
        {
          containerSelector: '#non-existent-recon-container',
          layoutComponent: 'UiSearchBar',
          children: [],
        },
      ],
    };

    runModernizer(document, manifest, '', '', true);

    const diagnostics = DevDiagnosticCollector.getItems();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].type).toBe('MISSING_SELECTOR');
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].message).toContain('#non-existent-recon-container');
  });

  it('records MISSING_SELECTOR diagnostic when component selector matches 0 elements in dev mode', () => {
    const manifest: SiteManifest = {
      components: [
        {
          name: 'UiButton',
          selector: '.non-existent-button-selector',
          action: 'replace',
          propsMap: {},
        },
      ],
    };

    runModernizer(document, manifest, '', '', true);

    const diagnostics = DevDiagnosticCollector.getItems();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].type).toBe('MISSING_SELECTOR');
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].message).toContain('.non-existent-button-selector');
  });

  it('does NOT record diagnostics when isDev is false', () => {
    const manifest: SiteManifest = {
      reconstructs: [
        {
          containerSelector: '#missing-recon',
          layoutComponent: 'UiSearchBar',
          children: [],
        },
      ],
      components: [
        {
          name: 'UiButton',
          selector: '.missing-comp',
          action: 'replace',
          propsMap: {},
        },
      ],
    };

    runModernizer(document, manifest, '', '', false);

    const diagnostics = DevDiagnosticCollector.getItems();
    expect(diagnostics).toHaveLength(0);
  });

  it('does NOT record diagnostics for matching elements in dev mode', () => {
    const div = document.createElement('div');
    div.id = 'present-recon-container';
    document.body.appendChild(div);

    const manifest: SiteManifest = {
      reconstructs: [
        {
          containerSelector: '#present-recon-container',
          layoutComponent: 'UiSearchBar',
          children: [],
        },
      ],
    };

    runModernizer(document, manifest, '', '', true);

    const diagnostics = DevDiagnosticCollector.getItems();
    expect(diagnostics).toHaveLength(0);
  });
});
