import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check both current repo name spm-vscode and legacy name vscode-theme-manifest-intellisense
const candidatePaths = [
  path.resolve(__dirname, '../../spm-vscode/scripts/build-registry.js'),
  path.resolve(__dirname, '../../vscode-theme-manifest-intellisense/scripts/build-registry.js'),
];

const targetScript = candidatePaths.find((p) => fs.existsSync(p));

if (targetScript) {
  console.log(`[Registry] Found build-registry.js at ${targetScript}, updating schema...`);
  try {
    execSync(`node "${targetScript}"`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('[Registry] Failed to update schema from build-registry.js:', err.message);
  }
} else {
  console.log('[Registry] Sibling repository spm-vscode not present. Skipping registry update.');
}
