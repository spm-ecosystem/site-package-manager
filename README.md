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
Content Script (src/content/index.iife.tsx)
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
│   ├── build-registry.js            # Auto-generates src/components-registry.ts
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
│   ├── components/                  # Shared components submodule pointer (dedicated & primitives)
│   └── components-registry.ts       # Component registry (AUTO-GENERATED)
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

### Creating a New Component

To learn how to design, develop, and register React UI components in the SPM engine, refer to the **[Component Development Guide](file:///home/watashi/Projects/extension/docs/components.md)**.

---

### Contribution & Code Style Guidelines

- **Language**: English (code, comments, commits, files).
- **Commits**: Conventional Commits style (e.g. `feat:`, `fix:`, `docs:`, `refactor:`).
- **TypeScript**: Strict checks enabled (no implicit `any`, no unused variables).
- **Testing**: Run unit tests using `npm run test`.


---

## License

MIT
