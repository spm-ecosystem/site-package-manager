import fs from 'node:fs';
import path from 'node:path';

// Recursively find files matching the provided predicate.
export function findFiles(dir, predicate, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            findFiles(fullPath, predicate, fileList);
        } else if (entry.isFile() && predicate(entry)) {
            fileList.push(fullPath);
        }
    }

    return fileList;
}

// Find all content.css files under a directory.
export function findCssFiles(dir) {
    return findFiles(dir, entry => entry.name === 'content.css');
}