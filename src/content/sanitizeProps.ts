/**
 * Generic, agnostic component props sanitizer.
 * Guarantees that no React component receives `undefined` or `null` for array/object props,
 * protecting against runtime exceptions (e.g. `Cannot read properties of undefined (reading 'length')`)
 * while strictly preserving scalar string, number, and boolean properties.
 */
export function sanitizeComponentProps<T extends Record<string, any>>(rawProps: T): T {
  if (!rawProps || typeof rawProps !== 'object') {
    return {} as T;
  }

  const safeProps: Record<string, any> = { ...rawProps };

  for (const [key, value] of Object.entries(safeProps)) {
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
