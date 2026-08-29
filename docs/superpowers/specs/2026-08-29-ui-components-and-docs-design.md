# UI Components & Documentation Expansion Design

**Date:** 2026-08-29
**Author:** Antigravity AI Assistant & Engineering Team
**Target Repositories:** `spm-components` (`extension`), `spm-cli`, `spm-qa-test-suite`

---

## 1. Executive Summary

This design document specifies the architecture and implementation for **Bloco B** ecosystem enhancements:
1. **Gap 5**: Fix hardcoded `alt="Booru Post"` metadata in `UiPostDetails.tsx` and write complete documentation in `src/components/docs/components/UiPostDetails.md` & `docs/component-specs.md`.
2. **Gap 3**: Create generic form component `UiFormContainer.tsx` to modernise legacy forms (`site-o-extreme-forms`).
3. **Gap 6 / `DEFECT-LEG-03`**: Create `UiNestedTreeTable.tsx` component for hierarchical tree structures.
4. **Gap 6 / `DEFECT-EV-03`**: Create `UiTerminalConsole.tsx` component for streaming terminal logs and event output.
5. **Schema Synchronization**: Register all new components in `components-registry.ts` and regenerate C++ schemas in `spm-cli`.

---

## 2. Component Specifications

### 2.1 `UiPostDetails` Metadata Cleanup & Documentation
- **Metadata Fix**: Update `UiPostDetailsProps` in `src/components/dedicated/UiPostDetails.tsx` to include optional `imageAlt?: string`. Replace line 321 hardcoded `alt="Booru Post"` with `alt={imageAlt || 'Post image'}`.
- **Documentation**: Write `src/components/docs/components/UiPostDetails.md` describing props, `.vnr` code snippets, and CSS theme variable usage. Update `docs/components.md`.

### 2.2 `UiFormContainer` (Generic Form Modernizer)
- **File**: `src/components/dedicated/UiFormContainer.tsx`
- **Interfaces**:
  ```typescript
  export interface FormField {
    id: string;
    label: string;
    type?: 'text' | 'number' | 'password' | 'email' | 'textarea' | 'select' | 'checkbox';
    placeholder?: string;
    defaultValue?: string | boolean;
    options?: Array<{ label: string; value: string }>;
    required?: boolean;
  }

  export interface UiFormContainerProps {
    title?: string;
    subTitle?: string;
    fields?: FormField[];
    submitLabel?: string;
    actionUrl?: string;
    method?: string;
    hiddenInputs?: Record<string, string>;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }
  ```

### 2.3 `UiNestedTreeTable` (`DEFECT-LEG-03`)
- **File**: `src/components/dedicated/UiNestedTreeTable.tsx`
- **Interfaces**:
  ```typescript
  export interface TreeNode {
    id: string;
    label: string;
    values?: Record<string, string>;
    children?: TreeNode[];
    icon?: string;
  }

  export interface TreeColumn {
    key: string;
    title: string;
    width?: string;
  }

  export interface UiNestedTreeTableProps {
    title?: string;
    columns?: TreeColumn[];
    data?: TreeNode[];
    expandedDepth?: number;
    className?: string;
    style?: React.CSSProperties;
  }
  ```

### 2.4 `UiTerminalConsole` (`DEFECT-EV-03`)
- **File**: `src/components/dedicated/UiTerminalConsole.tsx`
- **Interfaces**:
  ```typescript
  export interface LogEntry {
    id?: string;
    timestamp?: string;
    level?: 'info' | 'warn' | 'error' | 'debug';
    message: string;
  }

  export interface UiTerminalConsoleProps {
    title?: string;
    logs?: LogEntry[];
    autoScroll?: boolean;
    maxLines?: number;
    filterLevel?: 'all' | 'info' | 'warn' | 'error';
    className?: string;
    style?: React.CSSProperties;
  }
  ```

---

## 3. Registration & C++ Schema Generation

1. **Registry Export**: Export `UiFormContainer`, `UiNestedTreeTable`, and `UiTerminalConsole` in `src/components-registry.ts` under `DEDICATED_COMPONENTS`.
2. **Docs Index**: Add all new component `.md` files under `src/components/docs/components/`.
3. **C++ Compiler Schema**: Run `python3 scripts/generate_component_registry.py` in `spm-cli` to update `component_registry.hpp`.

---

## 4. Verification Plan

1. **`extension`**:
   - Run `npm test` to verify Vitest component test suite.
   - Run `npm run build` to verify clean Vite + CRX bundle build.
2. **`spm-cli`**:
   - Run `python3 scripts/generate_component_registry.py`.
   - Run `cmake --build build` and `./build/test_registry`.
