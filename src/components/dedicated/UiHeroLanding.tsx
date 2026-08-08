import React, { useState } from 'react';

interface NavLink {
  label: string;
  url: string;
}

interface UiHeroLandingProps {
  siteName?: string;
  logoUrl?: string;
  tagline?: string;
  subtext?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  searchPlaceholder?: string;
  searchSubmitUrl?: string;
  searchParamName?: string;
  primaryLinks?: NavLink[];
}

export function UiHeroLanding({
  siteName = 'Site',
  logoUrl,
  tagline = 'Welcome',
  subtext = '',
  ctaLabel = 'Browse',
  ctaUrl = '/',
  searchPlaceholder = 'Search…',
  searchSubmitUrl = '/',
  searchParamName = 'q',
  primaryLinks = [],
}: UiHeroLandingProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const url = new URL(searchSubmitUrl);
    url.searchParams.set(searchParamName, query);
    window.location.href = url.toString();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--spm-bg-primary) 0%, #0d0d1a 50%, #0a0a12 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,106,245,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,106,245,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        {logoUrl ? (
          <a href={ctaUrl} style={{ display: 'inline-block' }}>
            <img
              src={logoUrl}
              alt={siteName}
              style={{
                maxWidth: '340px',
                width: '100%',
                height: 'auto',
                filter: 'drop-shadow(0 0 40px rgba(124,106,245,0.4))',
                transition: 'filter 0.3s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.filter = 'drop-shadow(0 0 55px rgba(124,106,245,0.65))'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.filter = 'drop-shadow(0 0 40px rgba(124,106,245,0.4))'; }}
            />
          </a>
        ) : (
          <h1 style={{
            fontSize: '52px',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #fff 0%, #a09fff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            letterSpacing: '-0.03em',
          }}>
            {siteName}
          </h1>
        )}
      </div>

      {/* Tagline */}
      {tagline && (
        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--spm-text-primary)',
          margin: '0 0 8px 0',
          textAlign: 'center',
          letterSpacing: '-0.01em',
        }}>
          {tagline}
        </h2>
      )}

      {/* Subtext */}
      {subtext && (
        <p style={{
          fontSize: '14px',
          color: 'var(--spm-text-muted)',
          margin: '0 0 36px 0',
          textAlign: 'center',
          maxWidth: '420px',
          lineHeight: 1.6,
        }}>
          {subtext}
        </p>
      )}

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          gap: '0',
          width: '100%',
          maxWidth: '520px',
          marginBottom: '28px',
          boxShadow: '0 0 0 1px var(--spm-border), 0 8px 32px rgba(0,0,0,0.4)',
          borderRadius: 'var(--spm-radius)',
          overflow: 'hidden',
        }}
      >
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            flex: 1,
            background: 'var(--spm-bg-secondary)',
            border: 'none',
            outline: 'none',
            padding: '14px 18px',
            fontSize: '14px',
            color: 'var(--spm-text-primary)',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--spm-accent)',
            border: 'none',
            color: 'var(--spm-accent-fg)',
            padding: '14px 22px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--spm-accent-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--spm-accent)'; }}
        >
          Search
        </button>
      </form>

      {/* CTA Browse Button */}
      <a
        href={ctaUrl}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '11px 28px',
          borderRadius: 'var(--spm-radius)',
          background: 'transparent',
          border: '1px solid var(--spm-border)',
          color: 'var(--spm-text-primary)',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'border-color 0.15s, background 0.15s',
          marginBottom: '44px',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.borderColor = 'var(--spm-accent)';
          el.style.background = 'rgba(124,106,245,0.08)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.borderColor = 'var(--spm-border)';
          el.style.background = 'transparent';
        }}
      >
        <span>🖼️</span> {ctaLabel}
      </a>

      {/* Navigation Links */}
      {primaryLinks.length > 0 && (
        <nav style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          maxWidth: '500px',
        }}>
          {primaryLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              style={{
                padding: '6px 14px',
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
