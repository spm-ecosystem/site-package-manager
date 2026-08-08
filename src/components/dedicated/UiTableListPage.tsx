import React from 'react';
import { UiTable, ColumnConfig } from './UiTable';
import { UiPaginationBar } from './UiPaginationBar';

interface WikiRow {
  iconUrl?: string;
  iconLink?: string;
  title?: string;
  titleUrl?: string;
  lastUpdatedText?: string;
  lastUpdatedUser?: string;
  lastUpdatedUserUrl?: string;
  version?: string;
}

interface PageLink {
  label: string;
  url: string;
}

interface UiTableListPageProps {
  pageTitle?: string;
  tableRows?: WikiRow[];
  pageLinks?: PageLink[];
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function UiTableListPage({
  pageTitle = 'Wiki Pages',
  tableRows = [],
  pageLinks = [],
  height = '100vh',
  className = '',
  style = {},
}: UiTableListPageProps) {
  // Columns layout for Wiki list table
  const columns: ColumnConfig<WikiRow>[] = [
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
              {item.lastUpdatedText.includes('(') ? (
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
      
      {/* Sidebar slot — legacy sidebar nodes reparented here */}
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

          <UiPaginationBar pageLinks={pageLinks} />
        </header>

        {/* Scrollable list of table rows */}
        <main
          style={{
            padding: '24px',
            flex: 1,
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <UiTable columns={columns} data={tableRows} />
        </main>
      </div>
    </div>
  );
}
