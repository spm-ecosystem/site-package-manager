import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

import { createLogger } from '../logger.js';

const log = createLogger('Compile CSS');

// Create the PostCSS processor used to compile website styles.
export function createProcessor() {
    return postcss([
        tailwindcss({
            content: [
                './index.html',
                './src/**/*.{js,ts,jsx,tsx}',
                './websites/**/*.json',
                './websites/**/*.tsx'
            ]
        }),
        autoprefixer
    ]);
}

// Compile a single CSS file.
export async function compileCssFile(processor, cssFile) {
    const outputDir = path.dirname(cssFile);
    const outputFile = path.join(outputDir, 'style.css');
    const cssContent = fs.readFileSync(cssFile, 'utf8');

    log.step(`Compiling ${cssFile} -> ${outputFile}...`);

    const result = await processor.process(cssContent, {
        from: cssFile,
        to: outputFile
    });

    fs.writeFileSync(outputFile, result.css, 'utf8');

    log.success(`Successfully compiled: ${outputFile}`);
}