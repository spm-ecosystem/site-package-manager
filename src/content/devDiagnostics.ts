export interface DevDiagnosticItem {
  id: string;
  type: 'MISSING_SELECTOR' | 'BUILD_ERROR' | 'DEV_SERVER_DISCONNECTED' | 'INVALID_PROP';
  severity: 'warning' | 'error';
  title: string;
  message: string;
  details?: string;
  timestamp: number;
}

export type DevDiagnosticListener = (items: DevDiagnosticItem[]) => void;

export class DevDiagnosticCollectorClass {
  private items: DevDiagnosticItem[] = [];
  private listeners: Set<DevDiagnosticListener> = new Set();
  private nextId: number = 1;

  public addDiagnostic(item: Omit<DevDiagnosticItem, 'id' | 'timestamp'>): void {
    const existingIndex = this.items.findIndex(
      (existing) =>
        existing.type === item.type &&
        existing.title === item.title &&
        existing.message === item.message &&
        (existing.details || '') === (item.details || '') &&
        existing.severity === item.severity
    );

    const timestamp = Date.now();

    if (existingIndex !== -1) {
      // Deduplicate: update existing item timestamp
      this.items[existingIndex] = {
        ...this.items[existingIndex],
        timestamp
      };
    } else {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `diag_${this.nextId++}_${Date.now()}`;

      const newItem: DevDiagnosticItem = {
        ...item,
        id,
        timestamp
      };
      this.items.push(newItem);
    }

    this.notify();
  }

  public getItems(severityFilter?: 'warning' | 'error'): DevDiagnosticItem[] {
    if (severityFilter) {
      return this.items.filter((item) => item.severity === severityFilter);
    }
    return [...this.items];
  }

  public clear(): void {
    this.items = [];
    this.notify();
  }

  public subscribe(listener: DevDiagnosticListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getItems();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('[DevDiagnosticCollector] Error in listener callback:', err);
      }
    });
  }
}

export const DevDiagnosticCollector = new DevDiagnosticCollectorClass();
