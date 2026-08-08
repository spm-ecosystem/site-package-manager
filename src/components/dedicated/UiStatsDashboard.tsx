import React from 'react';

interface StatItem {
  place?: string;
  amount: string;
  name: string;
  profileUrl?: string;
}

interface StatSection {
  title: string;
  items: StatItem[];
}

interface NavLink {
  label: string;
  url: string;
}

interface UiStatsDashboardProps {
  pageTitle?: string;
  dateRangeText?: string;
  navLinks?: NavLink[];
  sections?: StatSection[];
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function UiStatsDashboard({
  pageTitle = 'Statistics',
  dateRangeText = 'All time',
  navLinks = [],
  sections = [],
  height = '100vh',
  className = '',
  style = {},
}: UiStatsDashboardProps) {
  
  const renderStatCard = (title: string, items: StatItem[]) => {
    return (
      <div
        style={{
          flex: '1 1 280px',
          background: 'var(--spm-bg-secondary)',
          border: '1px solid var(--spm-border)',
          borderRadius: 'var(--spm-radius)',
          padding: '16px',
          boxSizing: 'border-box',
          minWidth: '240px',
        }}
      >
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--spm-text-primary)',
            margin: '0 0 12px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid var(--spm-border)',
            paddingBottom: '8px',
          }}
        >
          {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.length === 0 ? (
            <div style={{ color: 'var(--spm-text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
              No entries found.
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  padding: '4px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: idx === 0 ? 'rgba(234, 179, 8, 0.15)' : idx === 1 ? 'rgba(148, 163, 184, 0.15)' : 'var(--spm-bg-tertiary)',
                      color: idx === 0 ? 'rgb(234, 179, 8)' : idx === 1 ? 'rgb(148, 163, 184)' : 'var(--spm-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '10px',
                    }}
                  >
                    {item.place || (idx + 1)}
                  </span>
                  {item.profileUrl ? (
                    <a
                      href={item.profileUrl}
                      style={{
                        color: 'var(--spm-text-primary)',
                        fontWeight: 500,
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--spm-accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--spm-text-primary)')}
                    >
                      {item.name || 'Anonymous'}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--spm-text-primary)', fontWeight: 500 }}>
                      {item.name || 'Anonymous'}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    background: 'var(--spm-bg-tertiary)',
                    border: '1px solid var(--spm-border)',
                    color: 'var(--spm-text-muted)',
                  }}
                >
                  {item.amount}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

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
          padding: '16px 24px',
          borderBottom: '1px solid var(--spm-border)',
          background: 'var(--spm-bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {pageTitle}
          </h1>
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', background: 'var(--spm-bg-tertiary)', border: '1px solid var(--spm-border)', color: 'var(--spm-text-muted)' }}>
            {dateRangeText}
          </span>
        </div>

        {navLinks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', marginTop: '4px' }}>
            {navLinks.map((link, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span style={{ color: 'var(--spm-border)' }}>|</span>}
                <a
                  href={link.url}
                  style={{ color: 'var(--spm-accent)', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--spm-accent-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--spm-accent)')}
                >
                  {link.label}
                </a>
              </React.Fragment>
            ))}
          </div>
        )}
      </header>

      {/* Main Grid content */}
      <main
        style={{
          padding: '24px',
          flex: 1,
          overflowY: 'auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {sections.map((section, idx) => (
            <React.Fragment key={idx}>
              {renderStatCard(section.title, section.items)}
            </React.Fragment>
          ))}
        </div>
      </main>
    </div>
  );
}
