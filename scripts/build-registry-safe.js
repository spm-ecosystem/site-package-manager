import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetScript = path.resolve(__dirname, '../../vscode-theme-manifest-intellisense/scripts/build-registry.js');

if (fs.existsSync(targetScript)) {
  console.log('[Registry] Found build-registry.js, updating schema...');
  try {
    execSync(`node "${targetScript}"`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('[Registry] Failed to update schema from build-registry.js:', err.message);
  }
} else {
  console.log('[Registry] Sibling repository vscode-theme-manifest-intellisense not present. Skipping registry update.');
}
