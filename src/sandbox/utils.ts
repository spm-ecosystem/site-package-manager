// Global helper to rewrite relative asset paths into absolute URLs
export function makeUrlsAbsolute(html: string, baseUrlStr: string): string {
  try {
    const baseUrl = new URL(baseUrlStr);
    const baseOrigin = baseUrl.origin;
    const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);

    const resolve = (rel: string) => {
      if (!rel) return '';
      if (
        rel.startsWith('http://') || 
        rel.startsWith('https://') || 
        rel.startsWith('data:') || 
        rel.startsWith('javascript:') ||
        rel.startsWith('#') ||
        rel.startsWith('mailto:')
      ) {
        return rel;
      }
      if (rel.startsWith('//')) {
        return baseUrl.protocol + rel;
      }
      if (rel.startsWith('/')) {
        return baseOrigin + rel;
      }
      return baseOrigin + basePath + rel;
    };

    return html.replace(/\b(href|src)=["']([^"']+)["']/gi, (match, attr, val) => {
      try {
        return `${attr}="${resolve(val)}"`;
      } catch (e) {
        return match;
      }
    });
  } catch (err) {
    console.error('[SPM Sandbox] Error converting relative urls:', err);
    return html;
  }
}

// Compute clean CSS selectors hierarchically
export function computeCssSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.classList.contains('thumb')) return '.thumb';
  if (el.tagName.toLowerCase() === 'img') return 'img';
  if (el.tagName.toLowerCase() === 'a') return 'a';
  
  const path: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current.tagName && current.tagName.toLowerCase() !== 'div') {
    let selector = current.tagName.toLowerCase();
    if (current.className) {
      const cleanClass = current.className.replace('spm-inspected-element', '').trim();
      if (cleanClass) {
        selector += `.${cleanClass.split(/\s+/)[0]}`;
      }
    }
    path.unshift(selector);
    current = current.parentElement;
  }
  return path.join(' > ');
}
