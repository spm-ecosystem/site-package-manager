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

---

## 5. Dedicated Components & Prop Contracts Reference

This section documents the standard catalog of components located in `src/components/dedicated/` and their respective property contract APIs.

### Dedicated Components Directory

| Component | Purpose | Key Props |
| --- | --- | --- |
| `UiNavHeader` | Site navigation header | `siteName`, `logoUrl`, `logoHref`, `primaryLinks`, `secondaryLinks`, `layout` |
| `UiHeroLanding` | Full-viewport landing page hero | `siteName`, `logoUrl`, `logoHref`, `tagline`, `subtext`, `ctaLabel`, `ctaUrl`, `searchSubmitUrl`, `searchParamName`, `primaryLinks` |
| `UiSearchBar` | Search input field | `placeholder`, `defaultValue`, `submitUrl`, `queryParamName` |
| `UiImageCard` | Single image card with link | `imageUrl`, `linkUrl`, `title`, `id`, `width`, `aspectRatio`, `imageFit`, `showTitle` |
| `UiTagBadge` | Tag pill with post count | `label`, `count`, `href` |
| `UiPaginationBar` | Page navigation links | `pageLinks`, `paramName` |
| `UiModernGridPage` | Gallery page with sidebar slot | `pageTitle`, `items`, `pageLinks` |
| `UiImageViewer` | Full-height image that fills its container | `src`, `alt`, `fit` (`contain`\|`cover`), `background` |
| `UiScrollPanel` | Scrollable sidebar panel with search, tags, buttons, stats | `tags`, `buttons`, `statisticsHtml`, `showSearch`, `searchSubmitUrl`, `searchParamName`, `width` |
| `UiSplitLayout` | Two-column full-height layout shell | `imageSlot`, `tags`, `buttons`, `statisticsHtml`, `sidebarWidth`, `sidebarSide`, `imageFit`, `showSearch`, `searchSubmitUrl` |
| `UiCommentListPage` | Comment threads list with optional sidebar | `pageTitle`, `threads`, `pageLinks`, `height` |
| `UiDashboardPage` | List panel layout for options/actions | `pageTitle`, `subTitle`, `cards`, `height` |
| `UiStatsDashboard` | Metric tables/rankings blocks dashboard | `pageTitle`, `dateRangeText`, `navLinks`, `sections`, `height` |
| `UiTable` | Isolated tabular grid with row callback | `columns`, `data`, `onRowClick` |
| `UiTableListPage` | Search results page layout inside a `UiTable` | `pageTitle`, `tableRows`, `columns`, `pageLinks`, `height`, `onLoadMore` |
| `UiToastContainer` | Toast feedback overlays & confirmation portals | - |
| `UiPostDetails` | *(legacy)* Booru post page (monolith) | - |

---

### Component Contracts (Props)

#### `UiCommentListPage`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `pageTitle` | `string` | `'Comments'` | Title of the comments page |
| `threads` | `CommentThread[]` | `[]` | Array of comment threads (`id`, `thumbnailUrl`, `postUrl`, `postDate`, `postUser`, `postRating`, `postScore`, `tags`, `comments`) |
| `pageLinks` | `PageLink[]` | `[]` | Array of page links for pagination (`label`, `url`) |
| `height` | `string` | `'100vh'` | Layout height |

#### `UiDashboardPage`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `pageTitle` | `string` | `'Account Control Panel'` | Header title text |
| `subTitle` | `string` | - | Subtitle description |
| `cards` | `DashboardCard[]` | `[]` | Custom action cards (`title`, `description`, `url`, `urlLabel`) |
| `height` | `string` | `'100vh'` | Layout height |

#### `UiStatsDashboard`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `pageTitle` | `string` | `'Statistics'` | Header title text |
| `dateRangeText` | `string` | `'All time'` | Range label tag |
| `navLinks` | `NavLink[]` | `[]` | Navigation links (`label`, `url`) |
| `sections` | `StatSection[]` | `[]` | Stat card groups (`title`, list of `items` with `place`, `amount`, `name`, `profileUrl`) |
| `height` | `string` | `'100vh'` | Layout height |

#### `UiTableListPage`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `pageTitle` | `string` | `'Wiki Pages'` | Header title text |
| `tableRows` | `any[]` | `[]` | Data row list |
| `columns` | `TableColumnConfig[]` | - | Configuration of columns (`key`, `header`, `width`, `align`, `type`, `urlKey`, `badgeStyleKey`) |
| `pageLinks` | `PageLink[]` | `[]` | Pagination links |
| `height` | `string` | `'100vh'` | Layout height |
| `onLoadMore` | `() => Promise<{tableRows, hasMore}>` | - | Async infinite scroll trigger callback |

#### `UiImageViewer`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string` | - | Image URL |
| `alt` | `string` | `''` | Alt text |
| `fit` | `'contain' \| 'cover'` | `'contain'` | CSS `object-fit` |
| `background` | `string` | `var(--spm-bg-primary)` | Container background |

#### `UiScrollPanel`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tags` | `TagItem[]` | `[]` | Tags array (`name`, `count`, `type`, `url`) - grouped by `type` automatically |
| `buttons` | `ButtonItem[]` | `[]` | Button array (`label`, `url`) - auto-classified into nav/primary/ghost by label keywords |
| `statisticsHtml` | `string` | - | Raw HTML rendered in a statistics section |
| `showSearch` | `boolean` | `false` | Show UiSearchBar at the top |
| `searchSubmitUrl` | `string` | - | URL to submit searches to |
| `searchParamName` | `string` | `'q'` | Query parameter name |
| `width` | `string` | `'280px'` | Panel width |

#### `UiSplitLayout`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `imageSlot` | `{src, alt}[]` | `[]` | Image data - first item is rendered via `UiImageViewer` |
| `tags` | `TagItem[]` | `[]` | Forwarded to `UiScrollPanel` |
| `buttons` | `ButtonItem[]` | `[]` | Forwarded to `UiScrollPanel` |
| `statisticsHtml` | `string` | - | Forwarded to `UiScrollPanel` |
| `sidebarWidth` | `string` | `'280px'` | Panel width |
| `sidebarSide` | `'left' \| 'right'` | `'left'` | Panel position |
| `imageFit` | `'contain' \| 'cover'` | `'contain'` | Forwarded to `UiImageViewer` |
| `showSearch` | `boolean` | `false` | Show search in panel |
| `searchSubmitUrl` | `string` | - | Search URL |
| `searchParamName` | `string` | `'q'` | Search param name |

#### `UiHeroLanding`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `siteName` | `string` | `'Site'` | Fallback text if no logo |
| `logoUrl` | `string` | - | Logo image URL |
| `logoHref` | `string` | `'/'` | Logo link URL |
| `tagline` | `string` | - | Heading below logo |
| `subtext` | `string` | - | Subtitle paragraph |
| `ctaLabel` | `string` | `'Browse'` | CTA button text |
| `ctaUrl` | `string` | `'/'` | CTA button URL |
| `searchSubmitUrl` | `string` | - | If set, renders a search bar |
| `searchParamName` | `string` | `'q'` | Search param name |
| `primaryLinks` | `{label, url}[]` | `[]` | Pill nav links below CTA |
