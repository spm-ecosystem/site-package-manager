import { UiTagBadge } from './UiTagBadge';
import { UiSearchBar } from './UiSearchBar';
import { triggerProxyClick } from '../../content/engine';

export interface TagItem {
  name: string;
  count?: string;
  type?: string;
  url?: string;
}

export interface ButtonItem {
  label: string;
  url?: string;
  targetSelector?: string;
}

export interface UiScrollPanelProps {
  // Content slots - all optional, all JSON-driven
  tags?: TagItem[];
  buttons?: ButtonItem[];
  statisticsHtml?: string;
  // Search config
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchSubmitUrl?: string;
  searchParamName?: string;
  // Layout
  width?: string;
  className?: string;
  style?: React.CSSProperties;
  onClose?: () => void;
}

// Classify buttons by label so primary actions stand out
const NAV_LABELS = ['previous', 'next'];
const PRIMARY_LABELS = ['original image', 'add to favorites'];

function getButtonVariant(label: string): 'nav' | 'primary' | 'ghost' {
  const l = label.toLowerCase();
  if (NAV_LABELS.some(k => l.includes(k))) return 'nav';
  if (PRIMARY_LABELS.some(k => l.includes(k))) return 'primary';
  return 'ghost';
}

export function UiScrollPanel({
  tags = [],
  buttons = [],
  statisticsHtml,
  showSearch = false,
  searchPlaceholder = 'Search…',
  searchSubmitUrl,
  searchParamName = 'q',
  width = '280px',
  className = '',
  style = {},
  onClose,
}: UiScrollPanelProps) {
  const copyrightTags = tags.filter(t => t.type?.includes('copyright'));
  const characterTags = tags.filter(t => t.type?.includes('character'));
  const artistTags    = tags.filter(t => t.type?.includes('artist'));
  const generalTags   = tags.filter(t => t.type?.includes('general'));
  const metaTags      = tags.filter(t => t.type?.includes('metadata') || t.type?.includes('meta'));

  const navButtons     = buttons.filter(b => getButtonVariant(b.label) === 'nav');
  const primaryButtons = buttons.filter(b => getButtonVariant(b.label) === 'primary');
  const ghostButtons   = buttons.filter(b => getButtonVariant(b.label) === 'ghost');

  const renderSection = (title: string, groupTags: TagItem[]) => {
    if (!groupTags.length) return null;
    return (
      <div style={{ marginBottom: '20px' }}>
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--spm-text-muted)',
          fontWeight: 600,
        }}>
          {title}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {groupTags.map((tag, i) => (
            <UiTagBadge key={i} label={tag.name} count={tag.count} href={tag.url} />
          ))}
        </div>
      </div>
    );
  };

  const renderButtonGroup = (items: ButtonItem[], variant: 'nav' | 'primary' | 'ghost') => {
    if (!items.length) return null;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {items.map((btn, i) => {
          const isNav = variant === 'nav';
          const isPrimary = variant === 'primary';
          return (
            <a
              key={i}
              href={btn.url ?? '#'}
              onClick={e => {
                if (btn.targetSelector) {
                  e.preventDefault();
                  triggerProxyClick(btn.targetSelector);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: isNav ? '7px 16px' : isPrimary ? '6px 12px' : '5px 10px',
                borderRadius: 'var(--spm-radius)',
                fontSize: isNav ? '12px' : '11px',
                fontWeight: isNav ? 700 : isPrimary ? 600 : 400,
                textDecoration: 'none',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                background: isNav
                  ? 'var(--spm-accent)'
                  : isPrimary
                  ? 'var(--spm-bg-tertiary)'
                  : 'transparent',
                color: isNav
                  ? 'var(--spm-accent-fg)'
                  : 'var(--spm-text-primary)',
                border: isNav
                  ? '1px solid var(--spm-accent)'
                  : isPrimary
                  ? '1px solid var(--spm-border)'
                  : '1px solid transparent',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (isNav) {
                  el.style.background = 'var(--spm-accent-hover)';
                } else if (isPrimary) {
                  el.style.borderColor = 'var(--spm-accent)';
                  el.style.background = 'var(--spm-bg-secondary)';
                } else {
                  el.style.color = 'var(--spm-text-muted)';
                  el.style.borderColor = 'var(--spm-border)';
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (isNav) {
                  el.style.background = 'var(--spm-accent)';
                } else if (isPrimary) {
                  el.style.borderColor = 'var(--spm-border)';
                  el.style.background = 'var(--spm-bg-tertiary)';
                } else {
                  el.style.color = 'var(--spm-text-primary)';
                  el.style.borderColor = 'transparent';
                }
              }}
            >
              {btn.label}
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <aside
      className={className}
      style={{
        width,
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--spm-bg-secondary)',
        borderRight: '1px solid var(--spm-border)',
        padding: '16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        ...style,
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          style={{
            alignSelf: 'flex-end',
            background: 'transparent',
            border: 'none',
            color: 'var(--spm-text-primary)',
            cursor: 'pointer',
            padding: '4px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
      {/* Search */}
      {showSearch && searchSubmitUrl && (
        <div style={{ marginBottom: '20px' }}>
          <UiSearchBar
            placeholder={searchPlaceholder}
            submitUrl={searchSubmitUrl}
            queryParamName={searchParamName}
          />
        </div>
      )}

      {/* Navigation buttons (Previous / Next) */}
      {renderButtonGroup(navButtons, 'nav')}

      {/* Primary action buttons */}
      {renderButtonGroup(primaryButtons, 'primary')}

      {/* Ghost utility buttons */}
      {ghostButtons.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {renderButtonGroup(ghostButtons, 'ghost')}
        </div>
      )}

      {/* Divider before tags */}
      {(navButtons.length > 0 || primaryButtons.length > 0 || ghostButtons.length > 0) &&
        (tags.length > 0 || statisticsHtml) && (
          <hr style={{ border: 'none', borderTop: '1px solid var(--spm-border)', margin: '8px 0 16px 0' }} />
        )}

      {/* Tags grouped by type */}
      {renderSection('Artists', artistTags)}
      {renderSection('Copyright', copyrightTags)}
      {renderSection('Characters', characterTags)}
      {renderSection('General Tags', generalTags)}
      {renderSection('Meta', metaTags)}

      {/* Statistics raw HTML */}
      {statisticsHtml && (
        <div>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--spm-text-muted)',
            fontWeight: 600,
          }}>
            Statistics
          </p>
          <div
            style={{ fontSize: '12px', color: 'var(--spm-text-muted)', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: statisticsHtml }}
          />
        </div>
      )}
    </aside>
  );
}
