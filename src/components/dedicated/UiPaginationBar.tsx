interface UiPaginationBarProps {
  currentPage?: number;
  totalPages?: number;
  baseUrl?: string;
}

export function UiPaginationBar({ currentPage = 1, totalPages = 1, baseUrl = '#' }: UiPaginationBarProps) {
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    padding: '0 10px',
    borderRadius: 'var(--spm-radius)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
    border: '1px solid var(--spm-border)',
  };

  const activeStyle: React.CSSProperties = {
    ...btnBase,
    background: 'var(--spm-accent)',
    color: 'var(--spm-accent-fg)',
    borderColor: 'var(--spm-accent)',
  };

  const inactiveStyle: React.CSSProperties = {
    ...btnBase,
    background: 'var(--spm-bg-secondary)',
    color: 'var(--spm-text-primary)',
  };

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'wrap',
      }}
      aria-label="Pagination"
    >
      {currentPage > 1 && (
        <a
          href={`${baseUrl}?page=${currentPage - 1}`}
          style={inactiveStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-tertiary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-secondary)'; }}
        >
          ←
        </a>
      )}

      {pages.map(page => (
        <a
          key={page}
          href={`${baseUrl}?page=${page}`}
          style={page === currentPage ? activeStyle : inactiveStyle}
          onMouseEnter={e => {
            if (page !== currentPage) (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-tertiary)';
          }}
          onMouseLeave={e => {
            if (page !== currentPage) (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-secondary)';
          }}
        >
          {page}
        </a>
      ))}

      {currentPage < totalPages && (
        <a
          href={`${baseUrl}?page=${currentPage + 1}`}
          style={inactiveStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-tertiary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-secondary)'; }}
        >
          →
        </a>
      )}
    </nav>
  );
}
