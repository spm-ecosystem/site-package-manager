import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DevDiagnosticCollector, DevDiagnosticItem } from '../src/content/devDiagnostics';
import { runModernizer, SiteManifest } from '../src/content/modernizer';

describe('DevDiagnosticCollector', () => {
  beforeEach(() => {
    DevDiagnosticCollector.clear();
  });

  it('adds diagnostic items with auto-generated id and timestamp', () => {
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Missing Selector',
      message: 'Selector .missing-class did not match any elements.'
    });

    const items = DevDiagnosticCollector.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBeDefined();
    expect(typeof items[0].timestamp).toBe('number');
    expect(items[0].type).toBe('MISSING_SELECTOR');
    expect(items[0].severity).toBe('warning');
    expect(items[0].title).toBe('Missing Selector');
    expect(items[0].message).toBe('Selector .missing-class did not match any elements.');
  });

  it('deduplicates identical diagnostics and updates timestamp', () => {
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Missing Header',
      message: 'Header selector #main-nav not found',
      details: '{"selector": "#main-nav"}'
    });

    const firstTimestamp = DevDiagnosticCollector.getItems()[0].timestamp;
    expect(DevDiagnosticCollector.getItems()).toHaveLength(1);

    // Add identical diagnostic
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Missing Header',
      message: 'Header selector #main-nav not found',
      details: '{"selector": "#main-nav"}'
    });

    const items = DevDiagnosticCollector.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].timestamp).toBeGreaterThanOrEqual(firstTimestamp);
  });

  it('filters items by severity (warning vs error)', () => {
    DevDiagnosticCollector.addDiagnostic({
      type: 'MISSING_SELECTOR',
      severity: 'warning',
      title: 'Warning Title',
      message: 'A warning message'
    });

    DevDiagnosticCollector.addDiagnostic({
      type: 'BUILD_ERROR',
      severity: 'error',
      title: 'Error Title',
      message: 'An error message'
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
      message: 'Prop count is invalid'
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
      message: 'Unable to connect to ws://localhost:3000'
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
      message: 'Syntax error'
    });

    expect(listener).toHaveBeenCalledTimes(1);
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
          children: []
        }
      ]
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
          propsMap: {}
        }
      ]
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
          children: []
        }
      ],
      components: [
        {
          name: 'UiButton',
          selector: '.missing-comp',
          action: 'replace',
          propsMap: {}
        }
      ]
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
          children: []
        }
      ]
    };

    runModernizer(document, manifest, '', '', true);

    const diagnostics = DevDiagnosticCollector.getItems();
    expect(diagnostics).toHaveLength(0);
  });
});
