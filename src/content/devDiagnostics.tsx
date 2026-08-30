import React, { useState, useEffect } from 'react';
import {
  UiDevDiagnosticPanel,
  DevDiagnosticItem,
} from '../components/dedicated/UiDevDiagnosticPanel';

export type { DevDiagnosticItem };

export type DevDiagnosticListener = (items: DevDiagnosticItem[]) => void;

export class DevDiagnosticCollectorClass {
  private items: DevDiagnosticItem[] = [];
  private listeners: Set<DevDiagnosticListener> = new Set();
  private nextId: number = 1;

  public addDiagnostic(item: Omit<DevDiagnosticItem, 'id' | 'timestamp' | 'occurrenceCount'> & { occurrenceCount?: number }): void {
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
      const existing = this.items[existingIndex];
      this.items[existingIndex] = {
        ...existing,
        timestamp,
        occurrenceCount: (existing.occurrenceCount || 1) + 1,
      };
    } else {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `diag_${this.nextId++}_${Date.now()}`;

      const newItem: DevDiagnosticItem = {
        ...item,
        id,
        timestamp,
        occurrenceCount: item.occurrenceCount || 1,
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

export interface SpmDevDiagnosticBridgeProps {
  initialExpanded?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function SpmDevDiagnosticBridge(props: SpmDevDiagnosticBridgeProps) {
  const [items, setItems] = useState<DevDiagnosticItem[]>(() => DevDiagnosticCollector.getItems());

  useEffect(() => {
    setItems(DevDiagnosticCollector.getItems());
    const unsubscribe = DevDiagnosticCollector.subscribe((newItems) => {
      setItems([...newItems]);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <UiDevDiagnosticPanel
      items={items}
      onClear={() => DevDiagnosticCollector.clear()}
      {...props}
    />
  );
}
