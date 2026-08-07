# Site Package Manager (SPM)

A Chrome MV3 extension that modernizes legacy web interfaces using React 18 + Shadow DOM - without touching the original site's code. Configure site reconstructions declaratively through `.json` theme files, and design them visually in the built-in Sandbox IDE.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Theme Files (`websites/`)](#theme-files-websites)
  - [Manifest Schema](#manifest-schema)
  - [Prop Mapping Rules](#prop-mapping-rules)
  - [Preservation Slots](#preservation-slots)
  - [Responsive Breakpoints](#responsive-breakpoints)
- [Component System](#component-system)
  - [Primitives](#primitives)
  - [Dedicated Components](#dedicated-components)
- [Extension Popup](#extension-popup)
- [Visual Sandbox IDE](#visual-sandbox-ide)
- [Dev Server (Hot Reload)](#dev-server-hot-reload)
- [Contributing](#contributing)
  - [Adding a New Site Theme](#adding-a-new-site-theme)
  - [Creating a New Dedicated Component](#creating-a-new-dedicated-component)
  - [Running Tests](#running-tests)
  - [Code Style](#code-style)

---

## How It Works

```
Legacy Site HTML
      │
      ▼
Content Script (src/content/index.tsx)
  ├── Reads active theme manifest from chrome.storage.local
  ├── Extracts data from legacy DOM using selector rules
  ├── Hides legacy container
  ├── Mounts Shadow DOM host (CSS fully isolated)
  ├── Renders React component tree inside Shadow Root
  └── Reparents preserved legacy nodes (pagination, sidebar)
        into named slots inside the new React layout
```

The entire pipeline is driven by `.json` manifest files - no React code changes needed to support a new site.

---

## Project Structure

```
extension/
├── manifest.json                  # Chrome MV3 extension manifest
├── index.html                     # Popup entry point
├── sandbox.html                   # Visual Sandbox IDE (options page)
├── scripts/
│   └── dev-server.js              # Local WebSocket hot-reload server
├── src/
│   ├── content/
│   │   ├── index.tsx              # Engine: orchestrates injection pipeline
│   │   ├── engine.ts              # extractValue: selector/rule parser
│   │   └── content.css            # Tailwind CSS (injected inline in Shadow DOM)
│   ├── popup/
│   │   └── index.tsx              # Popup React UI (theme selector + toggle)
│   ├── sandbox/
│   │   └── index.tsx              # Visual Sandbox IDE (DOM inspector + canvas)
│   └── components/
│       ├── primitives/
│       │   └── LayoutPrimitives.tsx   # Generic building blocks (Box, Grid, Text…)
│       └── dedicated/
│           ├── UiImageCard.tsx        # Pre-built image card component
│           └── UiModernGridPage.tsx   # Pre-built image gallery page layout
├── websites/
│   ├── registry.json              # Index of available themes (mocked remote)
│   └── safebooru.json             # Safebooru theme manifest (example)
└── tests/
    └── engine.test.ts             # Unit tests for extractValue engine
```

---

## Getting Started

**Requirements:** Node.js 18+, npm 9+, Chrome 114+.

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm run test

# Start the hot-reload dev server (for theme authoring)
npm run dev-server
```

**Loading in Chrome:**
1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** and select the `dist/` folder
4. Navigate to any supported site (e.g. `safebooru.org`) and click the extension icon to activate a theme

---

## Theme Files (`websites/`)

Each `.json` file in `websites/` represents a theme package for a specific site. The engine reads the active theme from `chrome.storage.local` (set via the popup) and executes the reconstruction pipeline.

### Manifest Schema

```json
{
  "targetUrl": "*://example.com/*",
  "version": "1.0.0",
  "theme": {
    "cssVariables": {
      "--bg-color": "#000000",
      "--text-color": "#ffffff"
    }
  },
  "reconstructs": [
    {
      "containerSelector": "#content",
      "layoutComponent": "UiModernGridPage",
      "mediaQuery": "(min-width: 768px)",
      "propsMap": {
        "pageTitle": "h1 | text"
      },
      "preserve": {
        "paginationSlot": "div.pagination",
        "sidebarSlot": "#sidebar"
      },
      "children": [
        {
          "name": "items",
          "selector": ".post-card",
          "propsMap": {
            "imageUrl": "img | attr:src",
            "linkUrl": "a | attr:href",
            "title": "img | attr:title",
            "id": "self | attr:id"
          }
        }
      ]
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `targetUrl` | `string` | Chrome match pattern for which pages to activate |
| `theme.cssVariables` | `object` | CSS custom properties injected in the Shadow Root `:host` |
| `reconstructs` | `array` | List of reconstruction blocks (one per container) |
| `containerSelector` | `string` | CSS selector of the legacy container to replace |
| `layoutComponent` | `string` | Name of the React component to render (must be in registry) |
| `mediaQuery` | `string?` | Optional: only applies this block if the media query matches |
| `propsMap` | `object` | Maps React prop names to extraction rules |
| `preserve` | `object?` | Named slots: legacy nodes to reparent into the new layout |
| `children` | `array` | Child element collections extracted from the container |

### Prop Mapping Rules

Rules follow the format `"selector | operation"`:

| Rule | Example | Description |
|---|---|---|
| `selector \| text` | `"h2 \| text"` | Text content of first matching child |
| `selector \| attr:name` | `"img \| attr:src"` | Attribute value of first matching child |
| `self \| attr:name` | `"self \| attr:id"` | Attribute on the element itself |

### Preservation Slots

The `preserve` map allows keeping original legacy nodes (e.g. pagination, sidebar) alive inside the new React layout. The engine:

1. Extracts matching elements from the legacy container **before** hiding it
2. After React mounts, appends each node into a `<div id="{slotName}-container">` inside the Shadow DOM

To receive a preserved node, the layout component must render an element with the matching ID:

```tsx
// In UiModernGridPage.tsx
<div id="paginationSlot-container"></div>
<aside id="sidebarSlot-container"></aside>
```

### Responsive Breakpoints

Add `"mediaQuery"` to any reconstruct block to restrict it to specific screen sizes:

```json
{ "mediaQuery": "(min-width: 768px)", ... }  // Desktop only
{ "mediaQuery": "(max-width: 767px)", ... }  // Mobile only
```

Blocks whose media query doesn't match are skipped, falling back to the next matching block or the original site.

---

## Component System

### Primitives

Located in `src/components/primitives/LayoutPrimitives.tsx`.

Generic, composable building blocks. Use these to create layouts entirely from `.json` without writing any React code.

| Component | Renders | Key Props |
|---|---|---|
| `UiBox` | `<div>` | `className` |
| `UiFlexRow` | `<div class="flex flex-row …">` | `className` |
| `UiFlexColumn` | `<div class="flex flex-col …">` | `className` |
| `UiGrid` | `<div class="grid …">` | `className` |
| `UiText` | `<span>` | `className`, `content` |
| `UiImage` | `<img>` | `className`, `src`, `alt` |
| `UiLink` | `<a>` | `className`, `href` |

### Dedicated Components

Located in `src/components/dedicated/`.

Pre-built, opinionated components tailored for specific UI patterns. These accept structured props extracted from the legacy DOM and render a complete, styled section.

| Component | Purpose |
|---|---|
| `UiImageCard` | Single image card with link and title overlay |
| `UiModernGridPage` | Full gallery page with sidebar and pagination slots |

**Adding your component to the registry** - open `src/content/index.tsx` and add your import to `COMPONENT_REGISTRY`:

```typescript
import { MyNewCard } from '../components/dedicated/MyNewCard';

const COMPONENT_REGISTRY = {
  // …existing entries
  MyNewCard,
};
```

---

## Extension Popup

Click the SPM icon in the Chrome toolbar to open the popup.

- **Global Activation** - toggle the engine on/off for all sites. Reloads the current tab immediately.
- **Active Site** - shows the detected domain of the current tab.
- **Layout Theme** - dropdown listing themes available for the current domain. Selecting a theme downloads + caches the manifest and reloads the tab.

---

## Visual Sandbox IDE

Open **chrome://extensions → SPM → Extension options** to launch the full-screen Sandbox IDE.

The workspace has three panels:

| Panel | Purpose |
|---|---|
| **Left - Primitives** | Click any primitive or dedicated component to add it to the canvas |
| **Center - Legacy Explorer** | Interactive preview of the site's original HTML. Click any element to capture its CSS selector |
| **Center - Modern Canvas** | Visual representation of your component layout. Click a block to inspect/bind it |
| **Right - Properties Inspector** | Edit Tailwind classes, bind captured selectors to component props |
| **Right - JSON Output** | Live preview of the compiled manifest. Use **Export JSON** to download |

When the Dev Server is running, the Sandbox also listens for file changes and updates the canvas in real time.

---

## Dev Server (Hot Reload)

For local theme development, run the WebSocket server alongside your editor:

```bash
npm run dev-server
# [SPM DEV] WebSocket Server started on ws://localhost:8080
```

Any time you save a `.json` file in `websites/`, the server broadcasts the change to the Sandbox IDE - which reloads layouts instantly without a full browser refresh.

---

## Contributing

### Adding a New Site Theme

1. Create a new file `websites/<sitename>.json` following the [Manifest Schema](#manifest-schema).
2. Add a registry entry in `websites/registry.json`:
   ```json
   {
     "id": "sitename-theme-id",
     "name": "Theme Display Name",
     "description": "Short description",
     "domain": "example.com",
     "manifestPath": "websites/sitename.json"
   }
   ```
3. Add the site domain to `content_scripts.matches` in `manifest.json`.
4. Build and load the extension: `npm run build`.

### Creating a New Dedicated Component

1. Create `src/components/dedicated/UiMyComponent.tsx`:
   ```tsx
   interface UiMyComponentProps {
     title: string;
     imageUrl: string;
   }

   export function UiMyComponent({ title, imageUrl }: UiMyComponentProps) {
     return (
       <div className="...tailwind classes...">
         <img src={imageUrl} alt={title} />
         <span>{title}</span>
       </div>
     );
   }
   ```
2. Register it in `src/content/index.tsx` inside `COMPONENT_REGISTRY`.
3. Reference it by name in your theme `.json` file via `"layoutComponent"`.

### Running Tests

```bash
npm run test
```

Unit tests live in `tests/`. All test files that use DOM APIs must include the following directive at the top:

```typescript
// @vitest-environment jsdom
```

### Code Style

- **Language**: English only - code, comments, commit messages, file names.
- **Comments**: Minimal. Only add comments when the intent cannot be inferred from the code itself.
- **TypeScript**: Strict mode. No unused locals or imports (`"noUnusedLocals": true`).
- **Commits**: Use Conventional Commits format (`feat:`, `fix:`, `chore:`, `refactor:`, `style:`).
- **Styling**: Tailwind CSS utility classes only. No inline `style` objects in component JSX except for dynamic engine resets.

---

## License

MIT
