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

  if (extractor === 'hrefOrOnclick') {
    const href = targetEl.getAttribute('href');
    if (href && href !== '#' && !href.startsWith('javascript:')) return href;
    const onclick = targetEl.getAttribute('onclick') || '';
    const match = onclick.match(/(?:document|window)\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i) || onclick.match(/document\.location\s*=\s*['"]([^'"]+)['"]/i);
    if (match) return match[1];
    return href || null;
  }

  if (extractor === 'selector') {
    let spmId = targetEl.getAttribute('data-spm-id');
    if (!spmId) {
      spmId = 'spm-id-' + Math.random().toString(36).substring(2, 9);
      targetEl.setAttribute('data-spm-id', spmId);
    }
    return `[data-spm-id="${spmId}"]`;
  }

  return null;
}
