import React from 'react';

interface DashboardCard {
  title: string;
  description?: string;
  url: string;
  urlLabel?: string;
}

interface UiDashboardPageProps {
  pageTitle?: string;
  subTitle?: string;
  cards?: DashboardCard[];
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function UiDashboardPage({
  pageTitle = 'Account Control Panel',
  subTitle,
  cards = [],
  height = '100vh',
  className = '',
  style = {},
}: UiDashboardPageProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height,
        background: 'var(--spm-bg-primary)',
        color: 'var(--spm-text-primary)',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '24px',
          borderBottom: '1px solid var(--spm-border)',
          background: 'var(--spm-bg-secondary)',
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {pageTitle}
        </h1>
        {subTitle && (
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--spm-text-muted)', lineHeight: '1.4' }}>
            {subTitle}
          </p>
        )}
      </header>

      {/* Main List */}
      <main
        style={{
          padding: '24px',
          flex: 1,
          overflowY: 'auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '800px',
          width: '100%',
        }}
      >
        {cards.length === 0 ? (
          <div style={{ color: 'var(--spm-text-muted)', fontSize: '14px', padding: '32px 0' }}>
            No options available.
          </div>
        ) : (
          cards.map((card, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--spm-bg-secondary)',
                border: '1px solid var(--spm-border)',
                borderRadius: 'var(--spm-radius)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'border-color 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--spm-accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--spm-border)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                  {card.title}
                </h3>
                <a
                  href={card.url}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--spm-accent-fg)',
                    background: 'var(--spm-accent)',
                    padding: '4px 12px',
                    borderRadius: 'calc(var(--spm-radius) - 2px)',
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--spm-accent-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--spm-accent)')}
                >
                  {card.urlLabel || 'Open →'}
                </a>
              </div>
              {card.description && (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--spm-text-muted)', lineHeight: '1.5' }}>
                  {card.description}
                </p>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
