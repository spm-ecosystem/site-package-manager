# SPM Multi-Site Dev Workspace & Active Theme Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable `spm dev` to automatically index multi-site workspace directories (such as `spm-websites/`), respond to site identification requests, and allow live theme switching directly from the Chrome Extension Popup Dev tab.

**Architecture:** `spm-cli` parses directory structures to detect single-theme vs workspace-root mode, builds a `g_workspaceThemes` domain index, communicates via JSON WebSocket protocol (`identify`, `workspace_state`, `select_theme`), and `extension/src/popup/index.tsx` renders a dynamic site & theme dropdown.

**Tech Stack:** C++17 (`nlohmann::json`, `ixwebsocket`), TypeScript/React 18 (`extension`).

## Global Constraints

- English only for code and comments.
- Named exports only for React components.
- Retain manual `Absolute Manifest Path` and `Browse Local Folder` fallback in extension popup.
- Retain candidate ports fallback (`8080..8090`).

---

### Task 1: C++ Workspace Indexer & Dev Server Multi-Site Support (`spm-cli`)

**Files:**
- Create: `src/utils/workspace_indexer.hpp`
- Modify: `src/commands/dev.hpp`
- Test: `src/commands/test_workspace_indexer.cpp`

**Interfaces:**
- Consumes: `fs::path`, `nlohmann::json`
- Produces: `veneer::WorkspaceIndexer::scanWorkspace(rootPath)`, `veneer::WorkspaceIndexer::getThemesForDomain(domain)`

- [ ] **Step 1: Create `src/utils/workspace_indexer.hpp`**

```cpp
#pragma once
#include <string>
#include <vector>
#include <map>
#include <filesystem>
#include <fstream>
#include <nlohmann/json.hpp>

namespace fs = std::filesystem;
using json = nlohmann::json;

namespace veneer {

struct ThemeSpec {
    std::string themeId;
    std::string themeLabel;
    std::string domain;
    std::string vnrProjectDir;
    std::string manifestPath;
    std::string cssPath;
};

class WorkspaceIndexer {
public:
    static std::map<std::string, std::vector<ThemeSpec>> scanWorkspace(const fs::path& rootPath) {
        std::map<std::string, std::vector<ThemeSpec>> index;
        if (!fs::exists(rootPath) || !fs::is_directory(rootPath)) return index;

        for (const auto& domainEntry : fs::directory_iterator(rootPath)) {
            if (!domainEntry.is_directory()) continue;
            std::string domain = domainEntry.path().filename().string();
            if (domain.find('.') == std::string::npos) continue; // skip non-domain folders

            for (const auto& themeEntry : fs::directory_iterator(domainEntry.path())) {
                if (!themeEntry.is_directory()) continue;
                std::string themeId = themeEntry.path().filename().string();
                fs::path vnrDir = themeEntry.path() / "vnr_project";
                fs::path manifestPath = themeEntry.path() / "manifest.json";
                fs::path cssPath = themeEntry.path() / "content.css";

                if (fs::exists(vnrDir) || fs::exists(manifestPath)) {
                    std::string label = themeId;
                    if (fs::exists(manifestPath)) {
                        try {
                            std::ifstream f(manifestPath);
                            json j = json::parse(f);
                            if (j.contains("theme") && j["theme"].contains("label")) {
                                label = j["theme"]["label"].get<std::string>();
                            }
                        } catch (...) {}
                    }
                    ThemeSpec spec{ themeId, label, domain, vnrDir.string(), manifestPath.string(), cssPath.string() };
                    index[domain].push_back(spec);
                }
            }
        }
        return index;
    }
};

} // namespace veneer
```

- [ ] **Step 2: Update `src/commands/dev.hpp` to handle workspace mode and WebSocket protocol**

Modify `dev.hpp` to parse `identify` and `select_theme` WebSocket actions and broadcast `workspace_state` JSON payloads.

- [ ] **Step 3: Recompile `spm-cli` and verify unit test**

Run: `cmake --build /home/watashi/Projects/spm-cli/build`
Expected: 0 errors.

- [ ] **Step 4: Commit Task 1**

```bash
git add src/utils/workspace_indexer.hpp src/commands/dev.hpp
git commit -m "feat(cli): add workspace indexer and multi-site websocket protocol to spm dev"
```

---

### Task 2: Extension WebSocket Handshake & Theme Selection (`extension`)

**Files:**
- Modify: `src/content/index.iife.tsx`
- Modify: `src/popup/index.tsx`

**Interfaces:**
- Consumes: WebSocket `ws://localhost:8080..8090`
- Produces: `{ action: "identify", domain }`, `{ action: "select_theme", domain, themeId }`

- [ ] **Step 1: Update `src/content/index.iife.tsx` WebSocket handshake**

In `index.iife.tsx`, send `{ action: "identify", domain: window.location.hostname }` on WebSocket open, and update storage on `workspace_state` message.

- [ ] **Step 2: Update `src/popup/index.tsx` Dev tab UI**

In `src/popup/index.tsx`, render:
- `Active Site: <domain>`
- Dropdown selector of `availableThemes`
- Keep absolute manifest path and browse folder input.

- [ ] **Step 3: Build extension**

Run: `npm --prefix /home/watashi/Projects/extension run build`
Expected: Build passes without TypeScript or Vite errors.

- [ ] **Step 4: Commit Task 2**

```bash
git add src/content/index.iife.tsx src/popup/index.tsx
git commit -m "feat(extension): add active site domain handshake and popup theme dropdown selector"
```
