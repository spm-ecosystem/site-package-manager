# Site Package Manager (SPM)

Site Package Manager (SPM) is a data-driven web modernization platform that allows developers to reconstruct legacy website interfaces using React 18 + Shadow DOM—without altering the original site's codebase. 

---

## The SPM Repository Ecosystem

The SPM platform is composed of 5 decoupled, specialized repositories. Below is how the ecosystem connects:

| Repository | Purpose | Primary Tech | Links |
| :--- | :--- | :--- | :--- |
| **`site-package-manager`** *(This repo)* | The extension engine that loads JSON manifests, intercepts page loads, and mounts components. | TypeScript, React, Vite | [GitHub Repository](https://github.com/spm-ecosystem/site-package-manager) |
| **`spm-cli`** | High-performance compiler and watcher. Compiles Veneer DSL spec folders into unified manifests and hosts WebSocket dev sync servers. | C++17, WebSockets | [GitHub Repository](https://github.com/spm-ecosystem/spm-cli) |
| **`spm-vscode`** | VS Code extension providing real-time syntax coloring, autocompletion, and linter diagnostics for Veneer `.vnr` layouts. | TypeScript, VS Code API | [GitHub Repository](https://github.com/spm-ecosystem/spm-vscode) |
| **`spm-websites`** | GitOps theme registry hosting compiled layouts and Veneer spec designs for target websites. | Veneer Spec, CSS | [GitHub Repository](https://github.com/spm-ecosystem/spm-websites) |
| **`spm-components`** | Reusable UI design system (primitives and dedicated page structures) injected into legacy pages. | React 18, CSS | [GitHub Repository](https://github.com/spm-ecosystem/spm-components) |

---

## Documentation Registry

To find specific rules, grammar specs, or guidelines, refer to the dedicated documentation files:

*   📖 [**Layout Manifest Schema Reference**](https://github.com/spm-ecosystem/spm-cli/blob/main/docs/manifest_schema.md): Details the compiled JSON manifest fields (`theme`, `components`, `reconstructs`), and dynamic prop extraction mapping rules.
*   💻 [**Veneer Spec Language Reference**](https://github.com/spm-ecosystem/spm-cli/blob/main/docs/veneer_spec.md): The syntax manual for the `.vnr` layout definition language, explaining classes, inheritance, scopes, and delimiters.
*   🎨 [**Component Development & API Reference**](https://github.com/spm-ecosystem/spm-components/blob/main/docs/components.md): Contains coding blueprints, design conventions, auto-registration scripts, and lists of all Primitives vs Dedicated UI components.
*   🧭 [**Contribution & Developer Guide**](./docs/contribution_guide.md): The step-by-step roadmap guiding you on how to contribute to site themes, React UI libraries, C++ parsers, or editor tools.

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

---

## Quick Start

### Getting Started
**Requirements:** Node.js 18+, npm 9+, Chrome 114+.

```bash
# Install dependencies
npm install

# Compile components and build the extension
npm run build

# Run Vitest test suites
npm run test
```

### Load in Chrome
1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** and select the generated `dist/` folder.
4. Visit a supported site and click the extension icon to select and load a visual theme.

---

## Anti-Flickering System

SPM features an automatic Anti-Flickering mechanism that prevents bright white flashes or legacy elements from showing before React components render:
- **Interception (`interceptor.iife.ts`)**: Injects a global `#spm-anti-flicker` stylesheet at `document_start` to set the page body opacity to `0` and force the background to match theme colors.
- **Visual Reveal**: Once page overrides are completed (or if the extension is turned off), it invokes `revealPage()` to smoothly fade in the new layout (`transition: opacity 0.2s`).
- **Cleanup**: Removes the style element from the DOM after 300ms.

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
