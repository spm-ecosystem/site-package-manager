import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEBSITES_DIR = path.join(__dirname, '../public/websites');

// Recursively find all content.css files under the websites directory
function findCssFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findCssFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name === 'content.css') {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function compileCss() {
  const cssFiles = findCssFiles(WEBSITES_DIR);
  console.log(`[Compile CSS] Found ${cssFiles.length} CSS file(s) to compile.`);

  const processor = postcss([tailwindcss, autoprefixer]);

  for (const cssFile of cssFiles) {
    try {
      const outputDir = path.dirname(cssFile);
      const outputFile = path.join(outputDir, 'style.css');
      const cssContent = fs.readFileSync(cssFile, 'utf-8');

      console.log(`[Compile CSS] Compiling ${cssFile} -> ${outputFile}...`);
      const result = await processor.process(cssContent, {
        from: cssFile,
        to: outputFile
      });

      fs.writeFileSync(outputFile, result.css, 'utf-8');
      console.log(`[Compile CSS] Successfully compiled: ${outputFile}`);
    } catch (err) {
      console.error(`[Compile CSS] Failed to compile ${cssFile}:`, err.message);
    }
  }
}

compileCss().catch(err => {
  console.error('[Compile CSS] Compilation error:', err);
  process.exit(1);
});
