import { UiSearchBar } from './UiSearchBar';

interface NavLink {
  label: string;
  url: string;
}

interface UiHeroLandingProps {
  siteName?: string;
  logoUrl?: string;
  logoHref?: string;
  tagline?: string;
  subtext?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  searchPlaceholder?: string;
  searchSubmitUrl?: string;
  searchParamName?: string;
  primaryLinks?: NavLink[];
  className?: string;
  style?: React.CSSProperties;
}

export function UiHeroLanding({
  siteName,
  logoUrl,
  logoHref = '/',
  tagline,
  subtext,
  ctaLabel,
  ctaUrl,
  searchPlaceholder,
  searchSubmitUrl,
  searchParamName,
  primaryLinks = [],
  className = '',
  style = {},
}: UiHeroLandingProps) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'var(--spm-bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        ...style,
      }}
    >
      {/* Logo / Site name */}
      {(logoUrl || siteName) && (
        <a
          href={logoHref}
          style={{ display: 'inline-block', marginBottom: '24px', textDecoration: 'none' }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={siteName}
              style={{ maxWidth: '320px', width: '100%', height: 'auto', display: 'block' }}
            />
          ) : (
            <span
              style={{
                fontSize: '42px',
                fontWeight: 900,
                color: 'var(--spm-text-primary)',
                letterSpacing: '-0.03em',
              }}
            >
              {siteName}
            </span>
          )}
        </a>
      )}

      {/* Tagline */}
      {tagline && (
        <h1
          style={{
            margin: '0 0 8px 0',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--spm-text-primary)',
            textAlign: 'center',
            letterSpacing: '-0.01em',
          }}
        >
          {tagline}
        </h1>
      )}

      {/* Subtext */}
      {subtext && (
        <p
          style={{
            margin: '0 0 32px 0',
            fontSize: '14px',
            color: 'var(--spm-text-muted)',
            textAlign: 'center',
            maxWidth: '440px',
            lineHeight: 1.6,
          }}
        >
          {subtext}
        </p>
      )}

      {/* Search bar - reuses UiSearchBar so behaviour is identical */}
      {searchSubmitUrl && (
        <UiSearchBar
          placeholder={searchPlaceholder}
          submitUrl={searchSubmitUrl}
          queryParamName={searchParamName}
          style={{ maxWidth: '520px', marginBottom: '16px' }}
        />
      )}

      {/* CTA button */}
      {ctaUrl && ctaLabel && (
        <a
          href={ctaUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '9px 22px',
            borderRadius: 'var(--spm-radius)',
            background: 'transparent',
            border: '1px solid var(--spm-border)',
            color: 'var(--spm-text-muted)',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'border-color 0.15s, color 0.15s, background 0.15s',
            marginBottom: primaryLinks.length > 0 ? '32px' : '0',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = 'var(--spm-accent)';
            el.style.color = 'var(--spm-text-primary)';
            el.style.background = 'var(--spm-bg-secondary)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = 'var(--spm-border)';
            el.style.color = 'var(--spm-text-muted)';
            el.style.background = 'transparent';
          }}
        >
          {ctaLabel}
        </a>
      )}

      {/* Nav links - data comes entirely from JSON children */}
      {primaryLinks.length > 0 && (
        <nav
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            maxWidth: '560px',
          }}
        >
          {primaryLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              style={{
                padding: '5px 14px',
                borderRadius: '999px',
                background: 'var(--spm-bg-secondary)',
                border: '1px solid var(--spm-border)',
                color: 'var(--spm-text-muted)',
                fontSize: '12px',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'color 0.12s, border-color 0.12s, background 0.12s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = 'var(--spm-text-primary)';
                el.style.borderColor = 'var(--spm-accent)';
                el.style.background = 'var(--spm-bg-tertiary)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = 'var(--spm-text-muted)';
                el.style.borderColor = 'var(--spm-border)';
                el.style.background = 'var(--spm-bg-secondary)';
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
