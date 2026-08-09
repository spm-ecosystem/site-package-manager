import React from 'react';
import { UiTable, ColumnConfig } from './UiTable';
import { UiPaginationBar } from './UiPaginationBar';
import { UiTagBadge } from './UiTagBadge';

export interface TableColumnConfig {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'link' | 'html' | 'badge' | 'checkbox';
  urlKey?: string;
  badgeStyleKey?: string;
}

interface PageLink {
  label: string;
  url: string;
}

interface UiTableListPageProps {
  pageTitle?: string;
  tableRows?: any[];
  columns?: TableColumnConfig[];
  pageLinks?: PageLink[];
  height?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoadMore?: () => Promise<{ tableRows: any[]; hasMore: boolean }>;
}

export function UiTableListPage({
  pageTitle = 'Wiki Pages',
  tableRows = [],
  columns: columnsProp,
  pageLinks = [],
  height = '100vh',
  className = '',
  style = {},
  onLoadMore,
}: UiTableListPageProps) {
  const [rows, setRows] = React.useState(tableRows);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const prevLink = pageLinks?.find(link => link.label === '<' || link.label === '‹' || link.label.toLowerCase().includes('prev') || link.label.toLowerCase().includes('previous'));
  const nextLink = pageLinks?.find(link => link.label === '>' || link.label === '›' || link.label.toLowerCase().includes('next'));
  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    setRows(tableRows);
  }, [tableRows]);

  React.useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl || !onLoadMore) return;

    let isLoading = false;
    let localHasMore = true;

    const handleScroll = async () => {
      if (isLoading || !localHasMore) return;

      const threshold = 200; // px threshold from bottom
      const offset = mainEl.scrollHeight - mainEl.scrollTop - mainEl.clientHeight;

      if (offset <= threshold) {
        isLoading = true;
        setLoadingMore(true);
        try {
          const res = await onLoadMore();
          if (res && res.tableRows && res.tableRows.length > 0) {
            setRows((prev) => {
              // Deduplicate table rows by titleUrl, aliasName or creator key
              const uniqueKeys = new Set(prev.map(x => x.titleUrl || x.aliasUrl || x.url || x.nameUrl || JSON.stringify(x)));
              const newRows = res.tableRows.filter(x => !uniqueKeys.has(x.titleUrl || x.aliasUrl || x.url || x.nameUrl || JSON.stringify(x)));
              return [...prev, ...newRows];
            });
          }
          localHasMore = res.hasMore;
        } catch (err) {
          console.error('[SPM Table Layout] Failed to load more:', err);
        } finally {
          isLoading = false;
          setLoadingMore(false);
        }
      }
    };

    mainEl.addEventListener('scroll', handleScroll);
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, [onLoadMore]);
  // Build columns configuration dynamically or fall back to default wiki columns
  const columns: ColumnConfig<any>[] = columnsProp
    ? columnsProp.map((col) => ({
        key: col.key,
        header: col.header,
        width: col.width,
        align: col.align,
        render: (item) => {
          const val = item[col.key];
          if (col.type === 'link') {
            const url = item[col.urlKey || ''] || '#';
            return (
              <a
                href={url}
                style={{
                  fontWeight: 600,
                  color: 'var(--spm-accent)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--spm-accent-hover)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--spm-accent)')}
              >
                {val || '-'}
              </a>
            );
          }
          if (col.type === 'html') {
            return <div dangerouslySetInnerHTML={{ __html: val || '' }} />;
          }
          if (col.type === 'badge') {
            const url = col.urlKey ? item[col.urlKey] : undefined;
            return <UiTagBadge label={val || ''} href={url} />;
          }
          if (col.type === 'checkbox') {
            return (
              <input
                type="checkbox"
                checked={!!val}
                disabled
                style={{
                  accentColor: 'var(--spm-accent)',
                  cursor: 'default',
                }}
              />
            );
          }
          return <span>{val || '-'}</span>;
        },
      }))
    : [
        {
          key: 'icon',
          header: '',
          width: '50px',
          align: 'center',
          render: (item) => (
            item.iconUrl ? (
              <a href={item.iconLink || '#'} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <img
                  src={item.iconUrl}
                  alt="icon"
                  style={{
                    width: '20px',
                    height: '20px',
                    opacity: 0.6,
                    filter: 'brightness(0) invert(1)',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                />
              </a>
            ) : null
          ),
        },
        {
          key: 'title',
          header: 'Title / Last Updated',
          render: (item) => (
            <div>
              <a
                href={item.titleUrl || '#'}
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--spm-accent)',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--spm-accent-hover)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--spm-accent)')}
              >
                {item.title || 'Untitled'}
              </a>
              {item.lastUpdatedText && (
                <div style={{ fontSize: '11px', color: 'var(--spm-text-muted)', marginTop: '4px' }}>
                  Last updated by{' '}
                  {item.lastUpdatedUser ? (
                    <a
                      href={item.lastUpdatedUserUrl || '#'}
                      style={{ color: 'var(--spm-text-primary)', fontWeight: 500, textDecoration: 'none' }}
                    >
                      {item.lastUpdatedUser}
                    </a>
                  ) : (
                    'System'
                  )}
                  {item.lastUpdatedText && item.lastUpdatedText.includes('(') ? (
                    <span> ({item.lastUpdatedText.split('(')[1]}</span>
                  ) : null}
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'version',
          header: 'Version',
          width: '150px',
          align: 'center',
          render: (item) => (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '12px',
                background: 'var(--spm-bg-tertiary)',
                border: '1px solid var(--spm-border)',
                color: 'var(--spm-text-muted)',
              }}
            >
              {item.version || 'Version 1'}
            </span>
          ),
        },
      ];

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        height,
        background: 'var(--spm-bg-primary)',
        color: 'var(--spm-text-primary)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        ...style,
      }}
    >
      <style>{`
        #sidebarSlot-container:empty {
          display: none !important;
        }
      `}</style>
      
      {/* Sidebar slot - legacy sidebar nodes reparented here */}
      <aside
        id="sidebarSlot-container"
        style={{
          width: '240px',
          flexShrink: 0,
          borderRight: '1px solid var(--spm-border)',
          background: 'var(--spm-bg-secondary)',
          padding: '16px',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      />

      {/* Main content scroll container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* Header */}
        <header
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--spm-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--spm-bg-secondary)',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--spm-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {pageTitle}
          </h1>

          {!onLoadMore && <UiPaginationBar pageLinks={pageLinks} />}
        </header>

        {/* Scrollable list of table rows */}
        <main
          ref={mainRef as any}
          style={{
            padding: '24px',
            flex: 1,
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <UiTable columns={columns} data={rows} />
          {loadingMore && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '2px solid var(--spm-border)',
                borderTopColor: 'var(--spm-accent)',
                animation: 'spm-spin-table 0.6s linear infinite'
              }} />
              <style>{`
                @keyframes spm-spin-table {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}
        </main>
      </div>

      {!onLoadMore && pageLinks && pageLinks.length > 0 && (prevLink || nextLink) && (
        <div
          className="spm-floating-pagination"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(26, 26, 26, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--spm-border)',
            borderRadius: '24px',
            padding: '6px 12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {prevLink && (
            <a
              href={prevLink.url}
              style={{
                color: 'var(--spm-text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '16px',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'var(--spm-accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--spm-text-primary)';
              }}
            >
              ← Prev
            </a>
          )}
          {prevLink && nextLink && <div style={{ width: '1px', height: '16px', background: 'var(--spm-border)' }} />}
          {nextLink && (
            <a
              href={nextLink.url}
              style={{
                color: 'var(--spm-text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '16px',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'var(--spm-accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--spm-text-primary)';
              }}
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
