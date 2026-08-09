import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findCssFiles } from './css/discovery.js';
import { compileCssFile, createProcessor } from './css/compiler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEBSITES_DIR = path.join(__dirname, '../websites');

async function compileCss() {
    const cssFiles = findCssFiles(WEBSITES_DIR);
    console.log(`[Compile CSS] Found ${cssFiles.length} CSS file(s) to compile.`);

    const processor = createProcessor();

    for (const cssFile of cssFiles) {
        try {
            await compileCssFile(processor, cssFile);
        } catch (err) {
            console.error(`[Compile CSS] Failed to compile ${cssFile}:`, err.message);
        }
    }
}

compileCss().catch(err => {
    console.error('[Compile CSS] Compilation error:', err);
    process.exit(1);
});