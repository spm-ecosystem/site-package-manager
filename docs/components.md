# Site Package Manager (SPM) - Component Development Guide

All modern layout reconstructions in SPM rely on React components to replace legacy DOM structures. This document defines the system contracts, rendering rules, auto-registration mechanics, and testing instructions for component development.

---

## 1. The Component Contract

Components must follow a strict, standardized contract to ensure compatibility with dynamic property injection and styling overrides.

### Coding Blueprint Example

```tsx
// 1. Interface first - all props optional with sensible defaults
interface UiMyComponentProps {
  items?: { label: string; url: string }[];
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

// 2. Export a named function - no default exports
export function UiMyComponent({
  items = [],
  title,
  className = '',
  style = {},
}: UiMyComponentProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--spm-bg-primary)',  // Always use visual CSS variables
        color: 'var(--spm-text-primary)',
        ...style,                              // Always spread incoming styles last
      }}
    >
      {/* Conditional rendering - avoids orphan markup */}
      {title && <h2>{title}</h2>}
      
      {items.map((item, i) => (
        <a key={i} href={item.url}>{item.label}</a>
      ))}
    </div>
  );
}
```

### Critical Rules
- **Named Exports Only**: Never use `export default`. The registry generator relies on named exports.
- **Style Spreading**: Always accept `className` and `style` in the properties, and apply them directly to the root element. Spread `style` last to allow external layout properties (like width, padding, margins) to overwrite component styles at mount time.

---

## 2. Design & Styling Conventions

Components are mounted inside an isolated **Shadow DOM** to prevent the host site's legacy styles from polluting the modern UI.
- **Strict CSS Variables**: Never write hardcoded color or spacing values (like `#ffffff` or `12px`). Use predefined SPM theme variables (e.g. `var(--spm-bg-primary)`, `var(--spm-border)`, `var(--spm-radius)`).
- **Conditional Rendering**: If data from a scraped property is missing, do not render a placeholder or empty tags. Use logical checks (`{data && <Element />}`) to keep the UI clean.

---

## 3. Auto-Registration Mechanics

You do **not** need to register your new components in registry files manually. SPM features an automated build step:

### How it works:
1.  When you run `npm run build` or `npm run dev`, the compiler executes `scripts/build-registry.js`.
2.  The script scans all component files under `src/components/` recursively.
3.  It extracts the component names, analyzes their TypeScript `Props` interface declarations, and generates:
    *   [`src/components-registry.ts`](file:///home/watashi/Projects/extension/src/components-registry.ts): The runtime registry mapping component names to their lazy-loaded TSX wrappers.
    *   `schemas/theme-manifest-schema.json`: The layout JSON validation schema used by VS Code to validate property configurations.

---

## 4. Running & Writing Tests

To run the component unit tests:
```bash
npm run test
```

### Writing Tests
For component unit tests that query DOM elements or interact with shadow roots, you must configure Vitest to run in a browser-like sandbox. Include the following environment header at the top of your test files:

```ts
// @vitest-environment jsdom
```
