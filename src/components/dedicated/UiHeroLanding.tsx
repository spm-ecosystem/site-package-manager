interface NavLink {
  label: string;
  url: string;
}

interface UiHeroLandingProps {
  // Identity
  siteName?: string;
  logoUrl?: string;
  logoHref?: string;
  // Hero copy
  tagline?: string;
  subtext?: string;
  // CTA
  ctaLabel?: string;
  ctaUrl?: string;
  // Search (delegates to UiSearchBar behaviour inline)
  searchPlaceholder?: string;
  searchSubmitUrl?: string;
  searchParamName?: string;
  // Nav links displayed as pills below CTA
  primaryLinks?: NavLink[];
  // Layout overrides
  className?: string;
  style?: React.CSSProperties;
}

import { useState } from 'react';

export function UiHeroLanding({
  siteName = 'Site',
  logoUrl,
  logoHref = '/',
  tagline,
  subtext,
  ctaLabel = 'Browse',
  ctaUrl = '/',
  searchPlaceholder = 'Search…',
  searchSubmitUrl = '/',
  searchParamName = 'q',
  primaryLinks = [],
  className = '',
  style = {},
}: UiHeroLandingProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = new URL(searchSubmitUrl, window.location.href);
      url.searchParams.set(searchParamName, query);
      window.location.href = url.toString();
    } catch {
      // noop
    }
  };

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
      <a
        href={logoHref}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          marginBottom: '24px',
        }}
      >
        {logoUrl && (
          <img
            src={logoUrl}
            alt={siteName}
            style={{ maxWidth: '320px', width: '100%', height: 'auto', display: 'block' }}
          />
        )}
        {!logoUrl && (
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
            margin: '0 0 36px 0',
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

      {/* Search bar — same visual style as UiSearchBar */}
      <form
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          maxWidth: '520px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--spm-bg-secondary)',
            border: `1px solid ${focused ? 'var(--spm-accent)' : 'var(--spm-border)'}`,
            borderRadius: 'var(--spm-radius)',
            padding: '0 10px',
            transition: 'border-color 0.15s',
          }}
        >
          {/* Search icon */}
          <button
            type="submit"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: focused ? 'var(--spm-accent)' : 'var(--spm-text-muted)',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            aria-label="Search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={searchPlaceholder}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--spm-text-primary)',
              fontSize: '13px',
              padding: '12px 0',
              fontFamily: 'inherit',
              minWidth: 0,
            }}
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--spm-text-muted)',
                padding: 0,
                lineHeight: 1,
                fontSize: '11px',
                flexShrink: 0,
              }}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* CTA button */}
      {ctaUrl && ctaLabel && (
        <a
          href={ctaUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 22px',
            borderRadius: 'var(--spm-radius)',
            background: 'transparent',
            border: '1px solid var(--spm-border)',
            color: 'var(--spm-text-muted)',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'border-color 0.15s, color 0.15s, background 0.15s',
            marginBottom: '40px',
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

      {/* Nav links as pills */}
      {primaryLinks.length > 0 && (
        <nav
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            maxWidth: '540px',
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
