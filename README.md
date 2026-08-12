# Site Package Manager (SPM)

A Chrome MV3 extension that modernizes legacy web interfaces using React 18 + Shadow DOM - without touching the original site's code. Configure reconstructions declaratively through `.json` manifest files, with automatic edge synchronization via Cloudflare Workers and dynamic WebSocket hot-reloading using the C++ `spm dev` watch utility.

---

## Table of Contents

- [Site Package Manager (SPM)](#site-package-manager-spm)
  - [Table of Contents](#table-of-contents)
  - [How It Works](#how-it-works)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
  - [Manifest Schema](#manifest-schema)
    - [Theme](#theme)
    - [Components](#components)
    - [Reconstructs](#reconstructs)
    - [Prop Mapping Rules](#prop-mapping-rules)
    - [Preservation Slots](#preservation-slots)
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
├── websites/                        # GitOps theme packages
│   └── safebooru.org/               # Website domain folder
│       └── obsidian-dark/           # Theme package folder
│           ├── manifest.json        # Theme configuration manifest
│           ├── content.css          # Custom Tailwind styling tokens
│           └── style.css            # Compiled static stylesheet (Vite-copied)
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

## Manifest Schema

Every `.json` in `websites/` is a theme manifest. Full structure:

```json
{
  "targetUrl": "*://example.com/*",
  "version": "1.0.0",
  "theme": { ... },
  "components": [ ... ],
  "reconstructs": [ ... ]
}
```

### Theme

```json
"theme": {
  "label": "Dark",
  "cssVariables": {
    "--spm-bg-primary":    "#000000",
    "--spm-bg-secondary":  "#111111",
    "--spm-bg-tertiary":   "#222222",
    "--spm-text-primary":  "#ffffff",
    "--spm-text-muted":    "#a1a1aa",
    "--spm-accent":        "#7c6af5",
    "--spm-accent-hover":  "#9d8fff",
    "--spm-accent-fg":     "#ffffff",
    "--spm-border":        "#333333",
    "--spm-radius":        "10px"
  },
  "customStyles": ".legacy-sidebar { display: none !important; }"
}
```

All components use exclusively `var(--spm-*)` variables. Changing these variables changes the entire theme with no component edits needed.

### Components

The `components` array replaces or hides **individual elements** on the page.

```json
"components": [
  {
    "name": "UiSearchBar",
    "selector": "#search-form",
    "action": "replace",
    "propsMap": {
      "defaultValue": "input[name='q'] | attr:value"
    },
    "props": {
      "placeholder": "Search…",
      "submitUrl": "https://example.com/search",
      "queryParamName": "q"
    }
  },
  {
    "name": "UiNavHeader",
    "selector": "#subnavbar",
    "action": "hide"
  }
]
```

| Field | Description |
| --- | --- |
| `name` | Component name (must exist in registry) |
| `selector` | CSS selector of the legacy element to target |
| `action` | `"replace"` - inject the component, `"hide"` - `display:none` |
| `propsMap` | Prop values extracted live from the DOM at injection time |
| `props` | Static prop values set directly in the JSON |
| `children` | Named arrays of child elements to extract (same format as reconstructs) |

### Reconstructs

The `reconstructs` array replaces **entire page sections** with a React component inside a Shadow DOM.

```json
"reconstructs": [
  {
    "containerSelector": "#post-view",
    "layoutComponent": "UiSplitLayout",
    "propsMap": {
      "statisticsHtml": "#stats ul | html"
    },
    "props": {
      "sidebarWidth": "280px",
      "sidebarSide": "left",
      "imageFit": "contain",
      "showSearch": true,
      "searchSubmitUrl": "https://example.com/search",
      "searchParamName": "tags"
    },
    "preserve": {
      "sidebarSlot": "div.sidebar"
    },
    "mediaQuery": "(min-width: 768px)",
    "children": [
      {
        "name": "imageSlot",
        "selector": "#image",
        "propsMap": {
          "src": "self | attr:src",
          "alt": "self | attr:alt"
        }
      },
      {
        "name": "tags",
        "selector": "#tag-sidebar li.tag",
        "scope": "document",
        "propsMap": {
          "name": "a:nth-child(2) | text",
          "count": "span.tag-count | text",
          "type": "self | attr:class",
          "url":  "a:nth-child(2) | attr:href"
        }
      },
      {
        "name": "buttons",
        "selector": ".link-list a",
        "scope": "document",
        "propsMap": {
          "label": "self | text",
          "url":   "self | attr:href"
        }
      }
    ]
  }
]
```

| Field | Description |
| --- | --- |
| `containerSelector` | CSS selector of the legacy container to replace |
| `layoutComponent` | Name of the React layout component (must exist in registry) |
| `propsMap` | Props extracted from inside the container at injection time |
| `props` | Static props passed directly - **supports all component props** |
| `preserve` | Named slots: legacy nodes reparented into the React layout (see below) |
| `mediaQuery` | Optional: only apply if this media query matches |
| `children` | Named arrays of child elements. Each becomes a prop array on the component. |
| `children[].scope` | `"document"` to query the full document instead of just the container |

> **Prop merge order:** `props` (static) → `propsMap` (dynamic) → `children` (arrays).  
> Dynamic values always override static ones.

### Prop Mapping Rules

Rules follow the format `"selector | operation"`:

| Rule | Example | Result |
| --- | --- | --- |
| `selector \| text` | `"h2 \| text"` | Text content of the first matching descendant |
| `selector \| attr:name` | `"img \| attr:src"` | Attribute value of first matching descendant |
| `selector \| html` | `"ul \| html"` | Inner HTML of first matching descendant |
| `self \| text` | `"self \| text"` | Text content of the element itself |
| `self \| attr:name` | `"self \| attr:class"` | Attribute of the element itself |

### Preservation Slots

`preserve` maps slot names to CSS selectors. The engine extracts those nodes before hiding the container and reparents them into a `<div id="{slotName}-container">` inside the Shadow DOM after React mounts.

The layout component must render a matching container element:

```tsx
// In your layout component:
<aside id="sidebarSlot-container" />
```

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

To add support for a new site or create a new theme package under an existing site domain, please refer to the detailed **[Theme Development Guide](file:///home/watashi/Projects/extension/websites/README.md)**.

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
