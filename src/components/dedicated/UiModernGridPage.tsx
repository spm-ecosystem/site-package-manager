import React, { useEffect, useState } from 'react';
import { UiImageCard } from './UiImageCard';
import { UiPaginationBar } from './UiPaginationBar';
import { UiSearchBar } from './UiSearchBar';
import { UiTagBadge } from './UiTagBadge';

interface GridItem {
  imageUrl: string;
  linkUrl: string;
  title: string;
  id: string;
}

interface PageLink {
  label: string;
  url: string;
}

interface TagItem {
  name: string;
  count?: string | number;
  type: string;
  url: string;
  addUrl?: string;
  removeUrl?: string;
}

export interface TagGroupConfig {
  title: string;
  typeKey: string;
}

interface UiModernGridPageProps {
  pageTitle: string;
  items: GridItem[];
  pageLinks?: PageLink[];
  sidebarHtml?: string;
  tags?: TagItem[];
  tagGroups?: TagGroupConfig[];
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchSubmitUrl?: string;
  searchParamName?: string;
  searchDefaultValue?: string;
  height?: string;
  sidebarWidth?: string;
  hideSidebarOnMobile?: boolean;
  mobileBreakpoint?: number;
  mobileColumns?: number;
  mobileGap?: string;
  mobilePadding?: string;
  mobileCardAspectRatio?: string;
  mobileHeaderSticky?: boolean;
  mobileShowHeader?: boolean;
  mobileShowPagination?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onLoadMore?: () => Promise<{ items: any[]; hasMore: boolean }>;
}

export function UiModernGridPage({
  pageTitle,
  items,
  pageLinks,
  sidebarHtml,
  tags = [],
  tagGroups,
  showSearch = true,
  searchPlaceholder = 'Search tags…',
  searchSubmitUrl = '',
  searchParamName = 'tags',
  searchDefaultValue = '',
  height = '100vh',
  sidebarWidth = '220px',
  hideSidebarOnMobile = true,
  mobileBreakpoint = 720,
  mobileColumns = 2,
  mobileGap = '8px',
  mobilePadding = '8px',
  mobileCardAspectRatio = '1 / 1.28',
  mobileHeaderSticky = true,
  mobileShowHeader = true,
  mobileShowPagination = true,
  className = '',
  style = {},
  onLoadMore,
}: UiModernGridPageProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [gridItems, setGridItems] = useState(items);
  const [loadingMore, setLoadingMore] = useState(false);
  const mainRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    setGridItems(items);
  }, [items]);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [mobileBreakpoint]);

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl || !onLoadMore) return;

    let isLoading = false;
    let localHasMore = true;

    const handleScroll = async () => {
      if (isLoading || !localHasMore) return;

      const threshold = 300; // px threshold from bottom
      const offset = mainEl.scrollHeight - mainEl.scrollTop - mainEl.clientHeight;

      if (offset <= threshold) {
        isLoading = true;
        setLoadingMore(true);
        try {
          const res = await onLoadMore();
          if (res && res.items && res.items.length > 0) {
            setGridItems((prev) => {
              // Deduplicate items by ID
              const existingIds = new Set(prev.map(x => x.id));
              const newItems = res.items.filter(x => !existingIds.has(x.id));
              return [...prev, ...newItems];
            });
          }
          localHasMore = res.hasMore;
        } catch (err) {
          console.error('[SPM Layout] Failed to load more:', err);
        } finally {
          isLoading = false;
          setLoadingMore(false);
        }
      }
    };

    mainEl.addEventListener('scroll', handleScroll);
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, [onLoadMore]);

  const showSidebar = !(isMobile && hideSidebarOnMobile);
  const showHeader = !isMobile || mobileShowHeader;
  const showPagination = (!isMobile || mobileShowPagination) && !onLoadMore;

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
              addUrl={tag.addUrl}
              removeUrl={tag.removeUrl}
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

    // Dynamic unique types fallback (generic!)
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
      className={`spm-modern-grid-page ${className}`.trim()}
      data-hide-sidebar-on-mobile={hideSidebarOnMobile ? 'true' : 'false'}
      style={{
        display: 'flex',
        width: '100%',
        height,
        background: 'var(--spm-bg-primary)',
        color: 'var(--spm-text-primary)',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        ...style,
      }}
    >
      <style>
        {`
          .spm-modern-grid-page {
            --spm-image-card-width: 160px;
            --spm-mobile-columns: ${mobileColumns};
            --spm-mobile-gap: ${mobileGap};
            --spm-mobile-padding: ${mobilePadding};
            --spm-mobile-card-aspect-ratio: ${mobileCardAspectRatio};
          }

          .spm-modern-grid-sidebar {
            scrollbar-width: thin;
            scrollbar-color: var(--spm-border) transparent;
          }

          .spm-modern-grid-main {
            scrollbar-width: thin;
            scrollbar-color: var(--spm-border) transparent;
          }

          .spm-image-card {
            break-inside: avoid;
          }

          @media (max-width: ${mobileBreakpoint}px) {
            .spm-modern-grid-page {
              --spm-image-card-width: 100%;
              height: 100vh !important;
              min-height: 100vh;
              background: var(--spm-bg-primary) !important;
              overflow-x: hidden !important;
              width: 100vw !important;
            }

            .spm-modern-grid-page[data-hide-sidebar-on-mobile="true"] .spm-modern-grid-sidebar {
              display: none !important;
            }

            .spm-modern-grid-content {
              width: 100%;
              height: 100%;
              flex: 1 1 100% !important;
              min-width: 0 !important;
              max-width: 100% !important;
              overflow-x: hidden !important;
            }

            .spm-modern-grid-header {
              position: ${mobileHeaderSticky ? 'sti' + 'cky' : 'relative'};
              top: 0;
              z-index: 5;
              padding: 10px 10px 8px !important;
              gap: 8px !important;
              background: var(--spm-bg-primary);
              backdrop-filter: blur(12px);
            }

            .spm-modern-grid-title {
              width: 100%;
              font-size: 18px !important;
              line-height: 1.2;
            }

            .spm-modern-grid-pagination {
              width: 100%;
              overflow-x: auto;
              flex-wrap: nowrap !important;
              padding-bottom: 2px;
              scrollbar-width: none;
            }

            .spm-modern-grid-pagination::-webkit-scrollbar {
              display: none;
            }

            .spm-modern-grid-main {
              display: grid !important;
              grid-template-columns: repeat(var(--spm-mobile-columns), minmax(0, 1fr));
              gap: var(--spm-mobile-gap);
              padding: var(--spm-mobile-padding) !important;
              overflow-y: auto;
              overflow-x: hidden !important;
              background: var(--spm-bg-primary);
            }

            .spm-modern-grid-main .spm-image-card {
              width: 100% !important;
              display: flex !important;
              margin: 0 !important;
              border: 0 !important;
              border-radius: 8px !important;
              background: var(--spm-bg-secondary) !important;
              transform: none !important;
              vertical-align: top;
            }

            .spm-modern-grid-main .spm-image-card-media {
              aspect-ratio: var(--spm-mobile-card-aspect-ratio) !important;
              background: var(--spm-bg-tertiary) !important;
            }

            .spm-modern-grid-main .spm-image-card img {
              object-fit: cover !important;
            }

            .spm-modern-grid-main .spm-image-card-caption {
              padding: 6px 2px 2px !important;
              border-top: 0 !important;
              background: var(--spm-bg-primary) !important;
            }

            .spm-modern-grid-main .spm-image-card-caption p {
              font-size: 10px !important;
              color: var(--spm-text-primary) !important;
              white-space: normal !important;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
          }

          @media (max-width: 360px) {
            .spm-modern-grid-main {
              column-gap: 6px;
              padding: 6px !important;
            }

            .spm-modern-grid-main .spm-image-card {
              margin-bottom: 6px;
            }
          }
        `}
      </style>

      {/* Sidebar slot — legacy nodes reparented here OR structured render */}
      <aside
        id="sidebarSlot-container"
        className="spm-modern-grid-sidebar"
        style={{
          display: showSidebar ? 'block' : 'none',
          width: sidebarWidth,
          flexShrink: 0,
          borderRight: '1px solid var(--spm-border)',
          background: 'var(--spm-bg-secondary)',
          padding: '16px',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
        dangerouslySetInnerHTML={sidebarHtml ? { __html: sidebarHtml } : undefined}
      >
        {!sidebarHtml && (
          <>
            {showSearch && searchSubmitUrl && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--spm-text-muted)', margin: '0 0 10px 0' }}>
                  Search
                </h3>
                <UiSearchBar
                  placeholder={searchPlaceholder}
                  submitUrl={searchSubmitUrl}
                  queryParamName={searchParamName}
                  defaultValue={searchDefaultValue}
                />
              </div>
            )}
            {renderedTagGroups}
          </>
        )}
      </aside>

      <div className="spm-modern-grid-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* Header */}
        {showHeader && (
          <header
            className="spm-modern-grid-header"
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--spm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <h1
              className="spm-modern-grid-title"
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--spm-text-primary)',
                letterSpacing: 0,
                flexShrink: 0,
              }}
            >
              {pageTitle || 'Gallery'}
            </h1>

            {showPagination && (
              <UiPaginationBar pageLinks={pageLinks} className="spm-modern-grid-pagination" />
            )}
          </header>
        )}

        {/* Grid */}
        <main
          ref={mainRef as any}
          className="spm-modern-grid-main"
          style={{
            padding: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'flex-start',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {gridItems.length === 0 ? (
            <div style={{ color: 'var(--spm-text-muted)', fontSize: '14px', margin: 'auto' }}>
              No items found.
            </div>
          ) : (
            <>
              {gridItems.map(item => (
                <UiImageCard
                  key={item.id}
                  id={item.id}
                  imageUrl={item.imageUrl}
                  linkUrl={item.linkUrl}
                  title={item.title}
                />
              ))}
              {loadingMore && (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '24px 0', order: 9999 }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid var(--spm-border)',
                    borderTopColor: 'var(--spm-accent)',
                    animation: 'spm-spin 0.6s linear infinite'
                  }} />
                  <style>{`
                    @keyframes spm-spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
