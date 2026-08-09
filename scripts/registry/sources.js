import { getDirectoryComponents, getFileComponents } from './discovery.js';

// Create the configured component sources.
export function createComponentSources(paths) {
    return [
        {
            name: 'PRIMITIVE_COMPONENTS',
            getComponents: () => getFileComponents(paths.primitives),
            generateImport: components =>
                `import { ${components.join(', ')} } from './primitives/LayoutPrimitives';`
        },
        {
            name: 'DEDICATED_COMPONENTS',
            getComponents: () => getDirectoryComponents(paths.dedicated),
            generateImport: components =>
                components.map(component =>
                    `import { ${component} } from './dedicated/${component}';`
                ).join('\n')
        }
    ];
}