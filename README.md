# Site Package Manager (SPM)

A Chrome MV3 extension that modernizes legacy web interfaces using React 18 + Shadow DOM - without touching the original site's code. Configure reconstructions declaratively through `.json` manifest files, with automatic edge synchronization via Cloudflare Workers and dynamic WebSocket hot-reloading using the C++ `spm dev` watch utility.

---

## Table of Contents

- [Site Package Manager (SPM)](#site-package-manager-spm)
  - [Table of Contents](#table-of-contents)
  - [How It Works](#how-it-works)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
  - [Veneer Spec Language](#veneer-spec-language)
  - [Compiled Layout Manifest Schema](#compiled-layout-manifest-schema)
  - [Component System](#component-system)
    - [Primitives](#primitives)
    - [Dedicated Components](#dedicated-components)
    - [Component Contracts (Props)](#component-contracts-props)
      - [`UiCommentListPage`](#uicommentlistpage)
      - [`UiDashboardPage`](#uidashboardpage)
      - [`UiStatsDashboard`](#uistatsdashboard)
      - [`UiTableListPage`](#uitablelistpage)
      - [`UiImageViewer`](#uiimageviewer)
      - [`UiScrollPanel`](#uiscrollpanel)
      - [`UiSplitLayout`](#uisplitlayout)
      - [`UiHeroLanding`](#uiherolanding)
  - [spm-cli & Local Watcher (C++ Dev Server)](#spm-cli--local-watcher-c-dev-server)
    - [Watcher Payload](#watcher-payload)
  - [Extension Popup](#extension-popup)
  - [Anti-Flickering System](#anti-flickering-system)
  - [Contributing](#contributing)
    - [Adding a New Site Theme](#adding-a-new-site-theme)
    - [Creating a New Component](#creating-a-new-component)
    - [Auto-Registration](#auto-registration)
    - [Running Tests](#running-tests)
    - [Code Style](#code-style)
  - [License](#license)

---

## How It Works

```md
Legacy Site HTML
      │
      ▼
Content Script (src/content/index.tsx)
  ├── Reads active theme manifest from chrome.storage.local
  ├── Applies CSS variables and customStyles to the main document
  ├── Processes "components" array → replaces / hides individual elements
  ├── Processes "reconstructs" array → replaces full page sections:
  │     ├── Extracts data via propsMap (from the container's DOM)
  │     ├── Extracts props statically from the "props" key
  │     ├── Extracts named children arrays from "children" selectors
  │     ├── Hides the legacy container
  │     ├── Mounts a Shadow DOM host (fully isolated CSS)
  │     └── Renders the React component with all merged props
  └── Reparents "preserve" nodes into named slots inside the Shadow DOM
```

The entire pipeline is data-driven. No React code changes are needed to support a new site.

---

## Project Structure

```md
extension/
├── manifest.json                    # Chrome MV3 manifest
├── index.html                       # Popup entry point
├── devloader.html                   # Dedicated local devloader page
├── scripts/
│   ├── build-registry.js            # Auto-generates src/components/registry.ts
│   └── compile-css.js               # Compiles content.css files using Tailwind + PostCSS
├── docs/                            # Detailed architecture & spec docs
│   ├── veneer_spec.md               # Veneer Spec syntax reference manual
│   └── manifest_schema.md           # Target layout manifest JSON schema
├── src/
│   ├── content/
│   │   ├── index.iife.tsx           # Content script entry point (resolves dynamic themes)
│   │   ├── interceptor.iife.ts      # Page-world prompt interception
│   │   ├── modernizer.tsx           # Core reconstruction engine & fetch cache fallbacks
│   │   └── engine.ts                # Selector / data-attribute extraction parser
│   ├── popup/
│   │   └── index.tsx                # Popup React UI (supports dev folder load & dynamic Worker listing)
│   └── components/
│       ├── registry.ts              # Component registry (AUTO-GENERATED)
│       └── spm-components/          # Shared components submodule pointer (dedicated & primitives)
└── tests/
    ├── engine.test.ts               # Unit tests for extractValue
    └── hot-reload.test.ts           # Unit tests for WebSocket client hot-reloading
```

---

## Getting Started

**Requirements:** Node.js 18+, npm 9+, Chrome 114+.

```bash
npm install      # install dependencies
npm run build    # build the extension → dist/
npm run test     # run unit tests
```

**Load in Chrome:**

1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select `dist/`
4. Visit a supported site and click the extension icon to activate a theme

---

## Veneer Spec Language

Veneer Spec is a declarative DSL designed for authoring clean, modular, and type-safe theme layouts. Features include structural scoping, class inheritance, raw string literal blocks, and a real-time background compiler linter.

For detailed syntax rules, inheritance paradigms, and modular structure examples, see the **[Veneer Spec Language Guide](file:///home/watashi/Projects/extension/docs/veneer_spec.md)**.

---

## Compiled Layout Manifest Schema

When Veneer Spec sources are compiled via `spm compile`, they generate a single unified `manifest.json` layout manifest. This target manifest is resolved at runtime by the SPM extension.

For detailed properties, attributes, preservation slots, and extraction rules of the target schema, see the **[Compiled Layout Manifest Schema Reference](file:///home/watashi/Projects/extension/docs/manifest_schema.md)**.

---

## Component System

All components follow the same contract:

- **100% CSS variable styling** - `var(--spm-*)` only, zero hardcoded colors
- **Always accept `className` and `style`** for external overrides
- **Conditional rendering** - sections that receive no data simply don't render
- **Single responsibility** - each component does one thing

### Primitives

Generic building blocks in `src/components/primitives/LayoutPrimitives.tsx`.

| Component | Renders | Key Props |
| --- | --- | --- |
| `UiBox` | `<div>` | standard HTML div props |
| `UiFlexRow` | `<div>` flex row | standard HTML div props |
| `UiFlexColumn` | `<div>` flex column | standard HTML div props |
| `UiGrid` | `<div>` grid | standard HTML div props |
| `UiText` | `<span>` | `content` |
| `UiImage` | `<img>` | `src`, `alt` |
| `UiLink` | `<a>` | `href` |

### Dedicated Components

Reusable, styled components in `src/components/dedicated/`.

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

---

## spm-cli & Local Watcher (C++ Dev Server)

The `spm-cli` is a binary written in C++ that facilitates local theme development, compilation, validation, and remote GitOps deployment.

### Features

- **Interactive Local Watcher (`spm dev -d <manifest.json>`)**: Starts a WebSocket server on `localhost:8080`. It watches the folder containing the manifest and CSS files. When files are saved:
  - It detects modifications and packages them into a unified JSON message: `{ "manifest": ..., "css": ... }`.
  - It broadcasts the payload to all connected extension clients on the target website in real-time.
  - The extension content script hot-reloads theme variables and custom CSS rules dynamically into Shadow DOM roots, or triggers a single tab reload if components or layout structure changed.
- **GitOps Importer & Publisher (`spm publish`)**: Validates the manifest against standard schemas, packages folder assets, and pushes the theme package to the remote registry.

### Installation & Rebuild

Navigate to `/home/watashi/Projects/spm-cli` and compile:
```bash
make
```

---

## Extension Popup

Click the SPM icon in Chrome's toolbar:

- **Global toggle** - Enable/disable the engine for all sites.
- **Active site** - Displays the current domain.
- **Theme selector** - Pick and activate a theme; reloads the tab immediately.
- **Colors customizer** - Override theme `cssVariables` values locally using color pickers.
- **Developer Mode** - Bypasses remote registry packages to load a local draft.
  - **Load Package Folder** - Opens a dedicated local devloader tab (`devloader.html`) to safely select and import a folder containing `manifest.json` and `style.css` without Chrome popup closure issues.
  - Displays loaded draft metadata (theme label, version, and stylesheet size) when active.

---

## Anti-Flickering System

To ensure a seamless visual experience, SPM includes a built-in **Anti-Flickering** system that prevents the visual flash of raw legacy elements or bright white screens before the reconstruction engine mounts.

1. **Immediate Hide:** Upon `document_start`, the MAIN-world interceptor (`src/content/interceptor.iife.ts`) injects a global style element (`#spm-anti-flicker`):

   ```css
   html {
     background-color: var(--spm-bg-primary, #121212) !important;
   }
   body {
     opacity: 0 !important;
     transition: opacity 0.2s ease-in-out !important;
   }
   ```

2. **Smooth Reveal:** Once the modernization engine completes component reconstructions (or if the engine aborts due to a global toggle disable), it calls `revealPage()`. This transitions the body opacity smoothly to `1` with a `0.2s` fade effect.
3. **Cleanup:** The style element is completely removed from the document after a `300ms` delay to leave the DOM clean.

---

## Contributing

### Adding a New Site Theme

Theme configurations are organized inside the `spm-websites` Git repository. Each theme is developed as a modular Veneer Spec project containing `.vnr` source files and is compiled using `spm compile`. To learn how to write and validate your theme, refer to the **[Veneer Spec Language Guide](file:///home/watashi/Projects/extension/docs/veneer_spec.md)**.

---

### Creating a New Component

Components must follow the system contract:

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
        background: 'var(--spm-bg-primary)',  // Always use CSS vars
        color: 'var(--spm-text-primary)',
        ...style,                              // Always spread style last
      }}
    >
      {title && <h2>{title}</h2>}             {/* Conditional - no orphan markup */}
      {items.map((item, i) => (
        <a key={i} href={item.url}>{item.label}</a>
      ))}
    </div>
  );
}
```

### Auto-Registration

You do **not** need to edit `src/components/registry.ts` manually!
During compilation, the pre-build script `scripts/build-registry.js` scans all components under `src/components/` and packages them automatically. Simply write your component file, run `npm run build`, and it will be ready to be used in manifests.



### Running Tests

```bash
npm run test
```

All test files that use DOM APIs must include:

```ts
// @vitest-environment jsdom
```

### Code Style

- **Language**: English - code, comments, commits, file names
- **Colors**: CSS variables only (`var(--spm-*)`) - never hardcoded `#rgb` values
- **Props**: Always include `className` and `style` for external override
- **Rendering**: All component sections must be conditional on data presence
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- **TypeScript**: Strict mode, no unused locals

---

## License

MIT
