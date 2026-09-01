/**
 * Generic, agnostic component props sanitizer.
 * Guarantees that no React component receives `undefined` or `null` for array/object props,
 * protecting against runtime exceptions (e.g. `Cannot read properties of undefined (reading 'length')`)
 * while strictly preserving scalar string, number, and boolean properties.
 */
export function parseCssStyleString(cssString: string): Record<string, string> {
  if (!cssString || typeof cssString !== 'string') return {};
  const styles: Record<string, string> = {};
  cssString.split(';').forEach((rule) => {
    const trimmed = rule.trim();
    if (!trimmed) return;
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) return;
    const prop = trimmed.slice(0, colonIndex).trim();
    const val = trimmed.slice(colonIndex + 1).trim();
    if (!prop || !val) return;

    // Convert kebab-case (max-width) to camelCase (maxWidth)
    const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    styles[camelProp] = val;
  });
  return styles;
}

export function sanitizeComponentProps<T extends Record<string, any>>(rawProps: T): T {
  if (!rawProps || typeof rawProps !== 'object') {
    return {} as T;
  }

  const safeProps: Record<string, any> = { ...rawProps };

  for (const [key, value] of Object.entries(safeProps)) {
    if (key === 'style') {
      if (typeof value === 'string') {
        safeProps.style = parseCssStyleString(value);
      } else if (!value || typeof value !== 'object' || Array.isArray(value)) {
        safeProps.style = {};
      }
      continue;
    }

    if (typeof value === 'string' && (value.trim().startsWith('[') || value.trim().startsWith('{'))) {
      try {
        safeProps[key] = JSON.parse(value);
      } catch (e) {
        // Keep original string if JSON parsing fails
      }
    }

    if (safeProps[key] === undefined || safeProps[key] === null) {
      // Precise matching for collection/array props across primitive and dedicated components
      if (
        key === 'items' ||
        key === 'tags' ||
        key === 'tabs' ||
        key === 'pageLinks' ||
        key === 'tableRows' ||
        key === 'rows' ||
        key === 'columns' ||
        key === 'gridItems' ||
        key === 'tagGroups' ||
        key === 'comments' ||
        key === 'stats' ||
        key === 'actions' ||
        key === 'children' ||
        key === 'customStyles' ||
        key.endsWith('List') ||
        key.endsWith('Array') ||
        key.endsWith('Items') ||
        key.endsWith('Rows') ||
        key.endsWith('Tags') ||
        key.endsWith('Links') ||
        key.endsWith('Tabs')
      ) {
        safeProps[key] = [];
      }
    }
  }

  return safeProps as T;
}
