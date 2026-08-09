import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findCssFiles } from './css/discovery.js';
import { compileCssFile, createProcessor } from './css/compiler.js';

import { createLogger } from './logger.js';

const log = createLogger('CSS');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEBSITES_DIR = path.join(__dirname, '../websites');

async function compileCss() {
    const cssFiles = findCssFiles(WEBSITES_DIR);
    log.info(`Found ${cssFiles.length} CSS file(s) to compile.`);

    const processor = createProcessor();

    for (const cssFile of cssFiles) {
        try {
            await compileCssFile(processor, cssFile);
        } catch (err) {
            log.error(`Failed to compile ${cssFile}:`, err.message);
            console.error(err);
        }
    }
}

compileCss().catch(err => {
    log.error('Compilation error:', err);
    process.exit(1);
});