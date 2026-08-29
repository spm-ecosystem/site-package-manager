# Security Integrity Pinning & VS Code Extension Fixes Design

**Date:** 2026-08-29
**Author:** Antigravity AI Assistant & Engineering Team
**Target Repositories:** `spm-components` (`extension`), `spm-vscode`

---

## 1. Executive Summary

This design document specifies the architecture for resolving two ecosystem security and reliability gaps:
1. **Gap 4 (`site-package-manager` / `extension`)**: SHA-256 integrity pinning keys (`spm_pinned_integrity:*`) were queried from `chrome.storage.local` but never set/written. Consequently, manifest fetching always fell back to trusting the server-provided `x-spm-integrity` header on every request, failing to protect against compromised theme servers.
2. **Gap 12 (`spm-vscode`)**: Author personal development path `/home/watashi/Projects/spm-cli/spm` remained hardcoded in executable resolution, and diagnostic compilation used `cp.exec` with string template interpolation instead of argument-array `cp.execFile`.

---

## 2. SHA-256 Integrity Pinning Persistence (`extension` / `site-package-manager`)

### 2.1 Persistence Flow & Storage Keys
When a theme package/version is loaded or selected by the user:
- Storage Key Pattern: `spm_pinned_integrity:${domain}:${themeName}:${version}` and `spm_pinned_integrity:${domain}`
- Format: `sha256-<64-char-hex-hash>`

**Writing Pinned Integrity:**
1. In `src/content/modernizer.tsx` (`fetchThemeFiles`):
   - Upon fetching `manifest.json`, compute `rawHash = await computeSha256(rawManifestText)`.
   - The verified hash `sha256-${rawHash}` is saved to `chrome.storage.local` under `spm_pinned_integrity:${domain}:${themeName}:${version}` and `spm_pinned_integrity:${domain}`.
2. In `src/popup/index.tsx`:
   - When switching active package or version, include the integrity hash when setting active theme state in `chrome.storage.local`.

### 2.2 Strict Integrity Verification
In `src/content/index.iife.tsx` & `src/content/modernizer.tsx`:
- Before applying theme, `chrome.storage.local.get` retrieves `pinnedIntegrity`.
- If `pinnedIntegrity` is present in storage, `fetchThemeFiles` MUST verify that the fetched manifest SHA-256 matches `pinnedIntegrity`.
- If a server returns a manifest whose computed SHA-256 does NOT match `pinnedIntegrity`:
  - Emit critical security error: `[SPM Security Error] Manifest SHA-256 integrity mismatch for ${domain} (${themeName}@${version})!`
  - Do NOT apply theme. Reveal original page cleanly via `revealPage()`.

---

## 3. VS Code Extension Refactoring (`spm-vscode`)

### 3.1 Executable Path Resolution (`src/extension.js`)
Update `getSpmExecutablePath()` in `spm-vscode/src/extension.js`:
1. Check `vscode.workspace.getConfiguration('spm').get('executablePath')`.
2. Check `process.env.SPM_CLI_PATH`.
3. Check relative sibling directory candidates:
   - `path.resolve(__dirname, '../../../spm-cli/build/spm')`
   - `path.resolve(__dirname, '../../../spm-cli/spm')`
4. Fall back to system executable `'spm'` via PATH lookup.

Removes hardcoded `/home/watashi/Projects/spm-cli/spm`.

### 3.2 Secure Process Execution
In `updateDiagnostics()` in `spm-vscode/src/extension.js`:
- Replace `cp.exec(`"${spmPath}" compile "${tempFile}" -o "${tempOut}"`, ...)` with:
  ```javascript
  cp.execFile(spmPath, ['compile', tempFile, '-o', tempOut], (err, stdout, stderr) => { ... });
  ```
- Eliminates shell interpolation and `/bin/sh -c` wrapper.

---

## 4. Verification Plan

1. **`extension`**:
   - Build extension: `npm run build`.
   - Run mock extension test verifying `chrome.storage.local.set` receives `spm_pinned_integrity` keys.
   - Verify `verifyManifestIntegrity` rejects mismatched manifest text.
2. **`spm-vscode`**:
   - Run `node src/extension.js` or extension test harness.
   - Verify `getSpmExecutablePath()` resolves without personal path leftover.
   - Verify `updateDiagnostics()` executes `cp.execFile` cleanly.
