# Design Spec: SPM Multi-Site Dev Workspace & Active Theme Selector

## 1. Overview
The **Multi-Site Workspace Watcher** enhances `spm-cli` and the SPM Chrome Extension to support watching multi-site repository directories (such as `spm-websites/`). When `spm dev` is executed on a workspace root directory containing multiple domain targets (`<domain>/<theme>/vnr_project/`), the C++ WebSocket server dynamically indexes all available themes, listens for client site identification requests, and allows live theme switching directly from the Chrome Extension Popup Dev tab.

---

## 2. Directory Structure & `spm create` Conventions

The workspace follows the standard domain-themed layout convention:

```text
workspace-root/
  ├── news.ycombinator.com/
  │   ├── dark-modern/
  │   │   ├── content.css
  │   │   ├── manifest.json
  │   │   └── vnr_project/
  │   │       ├── theme.vnr
  │   │       ├── pages.vnr
  │   │       └── navigation.vnr
  │   └── compact-light/
  │       ├── content.css
  │       ├── manifest.json
  │       └── vnr_project/
  │           └── ...
  └── safebooru.org/
      └── obsidian/
          ├── content.css
          ├── manifest.json
          └── vnr_project/
              └── ...
```

`spm create <domain>` automatically scaffolds this exact structure:
`spm create safebooru.org` -> creates `safebooru.org/default/vnr_project/` and initial `manifest.json` and `content.css`.

---

## 3. C++ `spm-cli` Architecture (`src/utils/workspace_indexer.hpp` & `src/commands/dev.hpp`)

### 3.1 Workspace Indexer
- When `spm dev -d <path>` starts:
  - Checks if `<path>` contains domain subdirectories.
  - If a single theme is passed, operates in Single-Theme Mode.
  - If a workspace root is passed, operates in Multi-Site Workspace Mode.
- Builds an in-memory index:
  `std::map<std::string, std::vector<ThemeSpec>> g_workspaceThemes;`

### 3.2 WebSocket Handshake Protocol
1. **Client Identification (`identify`)**:
   ```json
   {
     "action": "identify",
     "domain": "news.ycombinator.com",
     "url": "https://news.ycombinator.com/"
   }
   ```
2. **Server State Sync (`workspace_state`)**:
   ```json
   {
     "type": "workspace_state",
     "domain": "news.ycombinator.com",
     "activeThemeId": "dark-modern",
     "availableThemes": [
       { "id": "dark-modern", "label": "Dark Modern HN" },
       { "id": "compact-light", "label": "Compact Light HN" }
     ],
     "manifest": { ... },
     "css": "/* content.css */"
   }
   ```
3. **Client Theme Selection (`select_theme`)**:
   ```json
   {
     "action": "select_theme",
     "domain": "news.ycombinator.com",
     "themeId": "compact-light"
   }
   ```

---

## 4. Extension Dev Popup Interface (`src/popup/index.tsx`)

- **Active Site Header**: Displays `ACTIVE SITE: <domain>`.
- **Theme Dropdown Selector**: Renders available themes dynamically received from `spm dev` for the current domain.
- **Manual Override Fallback**: Preserves the `Absolute Manifest Path` input and `Browse Local Folder` button for standalone development without `spm dev`.

---

## 5. Error Handling & Fallbacks
- Automatic port fallback (`8080..8090`) maintained.
- If domain is not found in local workspace, extension gracefully logs diagnostic information and falls back to Cloud R2 CDN or manual path.
