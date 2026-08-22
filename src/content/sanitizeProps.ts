/**
 * Generic, agnostic component props sanitizer.
 * Guarantees that no React component receives `undefined` or `null` for array/object props,
 * protecting against runtime exceptions (e.g. `Cannot read properties of undefined (reading 'length')`).
 */
export function sanitizeComponentProps<T extends Record<string, any>>(rawProps: T): T {
  if (!rawProps || typeof rawProps !== 'object') {
    return {} as T;
  }

  const safeProps: Record<string, any> = { ...rawProps };

  for (const [key, value] of Object.entries(safeProps)) {
    if (value === undefined || value === null) {
      // Heuristic matching for array props across primitive and dedicated components
      if (
        key === 'items' ||
        key === 'tags' ||
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
        key.endsWith('s') ||
        key.endsWith('List') ||
        key.endsWith('Array') ||
        key.endsWith('Items')
      ) {
        safeProps[key] = [];
      }
    }
  }

  return safeProps as T;
}
