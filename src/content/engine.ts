export function extractValue(element: Element, queryRule: string): string | null {
  const parts = queryRule.split('|').map((s) => s.trim());
  const selector = parts[0];
  const extractor = parts[1];

  if (!selector || !extractor) return null;

  const targetEl = selector === 'self' ? element : element.querySelector(selector);
  if (!targetEl) return null;

  if (extractor.startsWith('attr:')) {
    const attrName = extractor.substring(5);
    return targetEl.getAttribute(attrName);
  }

  if (extractor === 'text') {
    return targetEl.textContent;
  }

  if (extractor === 'html') {
    return targetEl.innerHTML;
  }

  return null;
}
