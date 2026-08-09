export interface PageLink {
  label: string;
  url: string;
}

export interface UiPaginationBarProps {
  pageLinks?: PageLink[];
  paramName?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function UiPaginationBar({
  pageLinks = [],
  paramName = 'pid',
  className = '',
  style = {},
}: UiPaginationBarProps) {
  const currentPid = new URLSearchParams(window.location.search).get(paramName) ?? '0';

  const isActive = (url: string) => {
    try {
      const linkPid = new URL(url, window.location.origin).searchParams.get(paramName) ?? '0';
      return linkPid === currentPid;
    } catch {
      return false;
    }
  };

  // Derive page offset diff dynamically from consecutive page links
  let postsPerPage = 42;
  const pidValues = pageLinks
    .map(l => {
      try { return parseInt(new URL(l.url, window.location.origin).searchParams.get(paramName) ?? 'NaN', 10); }
      catch { return NaN; }
    })
    .filter(v => !isNaN(v) && v >= 0)
    .sort((a, b) => a - b);

  if (pidValues.length >= 2) {
    postsPerPage = pidValues[1] - pidValues[0] || postsPerPage;
  }

  const currentPidNum = parseInt(currentPid, 10);
  const prevUrl = currentPidNum > 0
    ? (() => { const u = new URL(window.location.href); u.searchParams.set(paramName, String(currentPidNum - postsPerPage)); return u.toString(); })()
    : null;
  const nextPid = currentPidNum + postsPerPage;
  const maxPid = pidValues.length > 0 ? Math.max(...pidValues) : currentPidNum;
  const nextUrl = nextPid <= maxPid
    ? (() => { const u = new URL(window.location.href); u.searchParams.set(paramName, String(nextPid)); return u.toString(); })()
    : null;

  const handleGoToPage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('pageid') as HTMLInputElement;
    const page = parseInt(input.value, 10);
    if (!isNaN(page) && page >= 1) {
      const u = new URL(window.location.href);
      u.searchParams.set(paramName, String((page - 1) * postsPerPage));
      window.location.href = u.toString();
    }
  };

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '26px',
    height: '26px',
    padding: '0 6px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: 400,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'inherit',
    border: '1px solid var(--spm-border)',
    background: 'var(--spm-bg-secondary)',
    color: 'var(--spm-text-primary)',
    transition: 'background 0.12s',
    flexShrink: 0,
  };

  const activeStyle: React.CSSProperties = {
    ...btnBase,
    fontWeight: 700,
    background: 'var(--spm-accent)',
    color: 'var(--spm-accent-fg)',
    border: '1px solid var(--spm-accent)',
    cursor: 'default',
  };

  const dimStyle: React.CSSProperties = {
    ...btnBase,
    color: 'var(--spm-text-muted)',
    pointerEvents: 'none',
  };

  if (pageLinks.length === 0) return null;

  return (
    <nav
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '3px',
        ...style,
      }}
      aria-label="Pagination"
    >
      {prevUrl ? (
        <a href={prevUrl} style={btnBase}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-tertiary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-secondary)'}
          aria-label="Previous page">‹</a>
      ) : (
        <span style={dimStyle}>‹</span>
      )}

      {pageLinks.map((link, i) => {
        const active = isActive(link.url);
        return (
          <a
            key={i}
            href={link.url}
            style={active ? activeStyle : btnBase}
            aria-current={active ? 'page' : undefined}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-tertiary)'; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-secondary)'; }}
          >
            {link.label}
          </a>
        );
      })}

      {nextUrl ? (
        <a href={nextUrl} style={btnBase}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-tertiary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-secondary)'}
          aria-label="Next page">›</a>
      ) : (
        <span style={dimStyle}>›</span>
      )}

      <form onSubmit={handleGoToPage} style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
        <input
          name="pageid"
          type="text"
          placeholder="page"
          style={{
            width: '42px',
            height: '26px',
            background: 'var(--spm-bg-secondary)',
            border: '1px solid var(--spm-border)',
            borderRadius: '5px',
            color: 'var(--spm-text-primary)',
            fontSize: '11px',
            padding: '0 6px',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--spm-accent)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--spm-border)')}
        />
        <button
          type="submit"
          style={{
            height: '26px',
            padding: '0 8px',
            background: 'var(--spm-bg-secondary)',
            border: '1px solid var(--spm-border)',
            borderRadius: '5px',
            color: 'var(--spm-text-primary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-tertiary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-secondary)'}
        >
          Go
        </button>
      </form>
    </nav>
  );
}
