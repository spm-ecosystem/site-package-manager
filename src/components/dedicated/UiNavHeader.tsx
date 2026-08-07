interface NavLink {
  label: string;
  url: string;
}

interface UiNavHeaderProps {
  siteName?: string;
  primaryLinks?: NavLink[];
  secondaryLinks?: NavLink[];
}

function isLinkActive(url: string): boolean {
  if (!url || url === '#' || url === '/') return false;
  try {
    const current = new URL(window.location.href);
    const target = new URL(url, window.location.origin);
    return current.pathname === target.pathname &&
      current.searchParams.get('page') === target.searchParams.get('page') &&
      current.searchParams.get('s') === target.searchParams.get('s');
  } catch {
    return false;
  }
}

export function UiNavHeader({ siteName = 'Site', primaryLinks = [], secondaryLinks = [] }: UiNavHeaderProps) {
  return (
    <header style={{ width: '100%', fontFamily: 'system-ui, sans-serif' }}>

      {/* Primary bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexWrap: 'wrap',
          background: 'var(--spm-bg-secondary)',
          borderBottom: '1px solid var(--spm-border)',
          padding: '0 16px',
          minHeight: '44px',
        }}
      >
        {/* Logo */}
        <a
          href="/"
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--spm-text-primary)',
            textDecoration: 'none',
            letterSpacing: '-0.03em',
            marginRight: '12px',
            flexShrink: 0,
          }}
        >
          {siteName}
        </a>

        {/* Primary nav links */}
        {primaryLinks.map((link, i) => {
          const active = isLinkActive(link.url);
          return (
            <a
              key={i}
              href={link.url}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '44px',
                padding: '0 10px',
                fontSize: '12px',
                fontWeight: active ? 700 : 400,
                color: active ? 'var(--spm-text-primary)' : 'var(--spm-text-muted)',
                textDecoration: 'none',
                borderBottom: active ? '2px solid var(--spm-accent)' : '2px solid transparent',
                transition: 'color 0.12s, border-color 0.12s',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--spm-text-primary)';
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--spm-text-muted)';
              }}
            >
              {link.label}
            </a>
          );
        })}
      </div>

      {/* Secondary bar */}
      {secondaryLinks.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            flexWrap: 'wrap',
            background: 'var(--spm-bg-primary)',
            borderBottom: '1px solid var(--spm-border)',
            padding: '0 16px',
            minHeight: '32px',
          }}
        >
          {secondaryLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '32px',
                padding: '0 8px',
                fontSize: '11px',
                color: 'var(--spm-text-muted)',
                textDecoration: 'none',
                borderRadius: '4px',
                transition: 'color 0.12s, background 0.12s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--spm-text-primary)';
                (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-secondary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--spm-text-muted)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
