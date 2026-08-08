import { UiTagBadge } from './UiTagBadge';
import { UiSearchBar } from './UiSearchBar';
import { triggerProxyClick } from '../../content/engine';

interface TagItem {
  name: string;
  count: string;
  type: string;
  url: string;
}

interface GenericButtonItem {
  label: string;
  url: string;
  targetSelector?: string;
  iconSvg?: string; // Optional raw SVG path/code passed from manifest
}

import React from 'react';

export interface TagGroupConfig {
  title: string;
  typeKey: string;
}

interface UiPostDetailsProps {
  imageUrl: string;
  tags?: TagItem[];
  tagGroups?: TagGroupConfig[];
  statisticsHtml?: string;
  buttons?: GenericButtonItem[];
  
  // Customizable sidebar search configuration
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchSubmitUrl?: string;
  searchParamName?: string;
}

export function UiPostDetails({
  imageUrl,
  tags = [],
  tagGroups,
  statisticsHtml = '',
  buttons = [],
  showSearch = true,
  searchPlaceholder = 'Search…',
  searchSubmitUrl = '',
  searchParamName = 'tags',
}: UiPostDetailsProps) {

  const renderTagGroup = (title: string, groupTags: TagItem[]) => {
    if (groupTags.length === 0) return null;
    return (
      <div style={{ marginBottom: '20px' }}>
        <h3
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--spm-text-muted)',
            margin: '0 0 10px 0',
          }}
        >
          {title}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {groupTags.map((tag, i) => (
            <UiTagBadge
              key={i}
              label={tag.name}
              count={tag.count}
              href={tag.url}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderedTagGroups = (() => {
    if (tagGroups && tagGroups.length > 0) {
      return tagGroups.map((g, idx) => {
        const filtered = tags.filter(t => t.type && t.type.includes(g.typeKey));
        return (
          <React.Fragment key={idx}>
            {renderTagGroup(g.title, filtered)}
          </React.Fragment>
        );
      });
    }

    // Dynamic unique types fallback (completely generic!)
    const uniqueTypes = Array.from(new Set(tags.map(t => t.type || 'general'))).filter(Boolean);
    return uniqueTypes.map((type, idx) => {
      const filtered = tags.filter(t => (t.type || 'general') === type);
      const title = type.charAt(0).toUpperCase() + type.slice(1).replace(/[-_]/g, ' ') + 's';
      return (
        <React.Fragment key={idx}>
          {renderTagGroup(title, filtered)}
        </React.Fragment>
      );
    });
  })();

  return (
    <div
      style={{
        display: 'flex',
        minHeight: 'calc(100vh - 76px)',
        background: 'var(--spm-bg-primary)',
        color: 'var(--spm-text-primary)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Sidebar: Configurable Search, Tags & Statistics */}
      <aside
        style={{
          width: '260px',
          flexShrink: 0,
          borderRight: '1px solid var(--spm-border)',
          background: 'var(--spm-bg-secondary)',
          padding: '20px',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {showSearch && searchSubmitUrl && (
          <div style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--spm-text-muted)',
                margin: '0 0 10px 0',
              }}
            >
              Search
            </h3>
            <UiSearchBar
              placeholder={searchPlaceholder}
              submitUrl={searchSubmitUrl}
              queryParamName={searchParamName}
            />
          </div>
        )}

        {renderedTagGroups}

        {/* Statistics section */}
        {statisticsHtml && (
          <div
            style={{
              marginTop: '24px',
              borderTop: '1px solid var(--spm-border)',
              paddingTop: '16px',
            }}
          >
            <h3
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--spm-text-muted)',
                margin: '0 0 10px 0',
              }}
            >
              Statistics
            </h3>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--spm-text-muted)',
                lineHeight: '1.6',
              }}
              dangerouslySetInnerHTML={{ __html: statisticsHtml }}
            />
          </div>
        )}
      </aside>

      {/* Main Image View & Dynamic Buttons */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Dynamic Generic Buttons below or above image */}
        {buttons.length > 0 && (
          <div
            style={{
              width: '100%',
              maxWidth: '800px',
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '16px',
            }}
          >
            {buttons.map((btn, i) => {
              const isActionNav = btn.label.toLowerCase() === 'previous' || btn.label.toLowerCase() === 'next';
              return (
                <a
                  key={i}
                  href={btn.url || '#'}
                  onClick={e => {
                    if (btn.targetSelector) {
                      e.preventDefault();
                      triggerProxyClick(btn.targetSelector);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: 'var(--spm-radius)',
                    fontSize: '12px',
                    fontWeight: isActionNav ? 700 : 500,
                    textDecoration: 'none',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                    background: isActionNav ? 'var(--spm-accent)' : 'var(--spm-bg-secondary)',
                    color: isActionNav ? 'var(--spm-accent-fg)' : 'var(--spm-text-primary)',
                    border: isActionNav ? '1px solid var(--spm-accent)' : '1px solid var(--spm-border)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (isActionNav) {
                      el.style.background = 'var(--spm-accent-hover)';
                    } else {
                      el.style.background = 'var(--spm-bg-tertiary)';
                      el.style.borderColor = 'var(--spm-accent)';
                    }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (isActionNav) {
                      el.style.background = 'var(--spm-accent)';
                    } else {
                      el.style.background = 'var(--spm-bg-secondary)';
                      el.style.borderColor = 'var(--spm-border)';
                    }
                  }}
                >
                  {btn.iconSvg && (
                    <span
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                      dangerouslySetInnerHTML={{ __html: btn.iconSvg }}
                    />
                  )}
                  {btn.label}
                </a>
              );
            })}
          </div>
        )}

        {/* Image Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--spm-bg-secondary)',
            border: '1px solid var(--spm-border)',
            borderRadius: 'var(--spm-radius)',
            padding: '20px',
            width: '100%',
            maxWidth: '800px',
            boxSizing: 'border-box',
          }}
        >
          <img
            src={imageUrl}
            alt="Booru Post"
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: 'calc(var(--spm-radius) - 2px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      </main>
    </div>
  );
}
