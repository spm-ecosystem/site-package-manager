import { useEffect, useState } from 'react';

interface NavLink {
  label: string;
  url: string;
}

interface UiNavHeaderProps {
  siteName?: string;
  logoUrl?: string;
  logoHref?: string;
  primaryLinks?: NavLink[];
  secondaryLinks?: NavLink[];
  layout?: 'standard' | 'stacked' | 'minimal';
  hideOnMobile?: boolean;
  mobileBreakpoint?: number;
  className?: string;
  style?: React.CSSProperties;
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

export function UiNavHeader({
  siteName = 'Site',
  logoUrl,
  logoHref = '/',
  primaryLinks = [],
  secondaryLinks = [],
  layout = 'standard',
  hideOnMobile = false,
  mobileBreakpoint = 720,
  className = '',
  style = {},
}: UiNavHeaderProps) {
  const [isMobile, setIsMobile] = useState(false);
  const isMinimal = layout === 'minimal';
  const isStacked = layout === 'stacked';

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [mobileBreakpoint]);

  if (hideOnMobile && isMobile) return null;

  return (
    <header
      className={className}
      style={{
        width: '100%',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Primary Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: isStacked ? 'column' : 'row',
          alignItems: isStacked ? 'flex-start' : 'center',
          gap: isStacked ? '8px' : '4px',
          flexWrap: 'wrap',
          background: 'var(--spm-bg-secondary)',
          borderBottom: '1px solid var(--spm-border)',
          padding: isStacked ? '12px 16px' : '0 16px',
          minHeight: isStacked ? 'auto' : '44px',
        }}
      >
        {/* Logo/Site Name */}
        <a
          href={logoHref}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--spm-text-primary)',
            textDecoration: 'none',
            letterSpacing: '-0.03em',
            marginRight: isStacked ? '0' : '12px',
            flexShrink: 0,
            height: isStacked ? 'auto' : '44px',
          }}
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt={siteName}
              style={{
                height: '24px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}
          <span>{siteName}</span>
        </a>

        {/* Primary nav links */}
        {!isMinimal && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
            }}
          >
            {primaryLinks.map((link, i) => {
              const active = isLinkActive(link.url);
              return (
                <a
                  key={i}
                  href={link.url}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: isStacked ? '32px' : '44px',
                    padding: '0 10px',
                    fontSize: '12px',
                    fontWeight: active ? 700 : 400,
                    color: active ? 'var(--spm-text-primary)' : 'var(--spm-text-muted)',
                    textDecoration: 'none',
                    borderBottom: !isStacked && active ? '2px solid var(--spm-accent)' : '2px solid transparent',
                    borderRadius: isStacked ? 'var(--spm-radius)' : '0',
                    background: isStacked && active ? 'var(--spm-bg-tertiary)' : 'transparent',
                    transition: 'color 0.12s, border-color 0.12s, background-color 0.12s',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!active) {
                      el.style.color = 'var(--spm-text-primary)';
                      if (isStacked) el.style.backgroundColor = 'var(--spm-bg-tertiary)';
                    }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!active) {
                      el.style.color = 'var(--spm-text-muted)';
                      if (isStacked) el.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Secondary Bar */}
      {!isMinimal && secondaryLinks.length > 0 && (
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
