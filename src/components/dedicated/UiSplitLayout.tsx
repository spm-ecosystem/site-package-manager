import React from 'react';
import { UiImageViewer } from './UiImageViewer';
import { UiScrollPanel } from './UiScrollPanel';
import { triggerProxyClick } from '../../content/engine';

interface ImageSlotItem {
  src?: string;
  alt?: string;
}

interface TagItem {
  name: string;
  count?: string;
  type?: string;
  url?: string;
}

interface ButtonItem {
  label: string;
  url?: string;
  targetSelector?: string;
}

interface UiSplitLayoutProps {
  // Slot: image - user maps via children[name="imageSlot"] in JSON
  imageSlot?: ImageSlotItem[];
  // Slot: sidebar content - user maps via children in JSON
  tags?: TagItem[];
  buttons?: ButtonItem[];
  statisticsHtml?: string;
  // Layout config - user sets via props in JSON
  sidebarWidth?: string;
  sidebarSide?: 'left' | 'right';
  imageFit?: 'contain' | 'cover';
  height?: string;
  splitButtons?: boolean;
  // Search forwarded to UiScrollPanel
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchSubmitUrl?: string;
  searchParamName?: string;
  // Overrides
  className?: string;
  style?: React.CSSProperties;
}

export function UiSplitLayout({
  imageSlot = [],
  tags = [],
  buttons = [],
  statisticsHtml,
  sidebarWidth = '280px',
  sidebarSide = 'left',
  imageFit = 'contain',
  height = '100vh',
  splitButtons = true,
  showSearch = false,
  searchPlaceholder = 'Search…',
  searchSubmitUrl,
  searchParamName = 'q',
  className = '',
  style = {},
}: UiSplitLayoutProps) {
  const image = imageSlot[0];
  const [isMobile, setIsMobile] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const imgLabels = ['previous', 'next', 'original image'];
  const imageButtons = splitButtons
    ? buttons.filter(b => imgLabels.some(lbl => b.label.toLowerCase().includes(lbl)))
    : [];
  const sidebarButtons = splitButtons
    ? buttons.filter(b => !imgLabels.some(lbl => b.label.toLowerCase().includes(lbl)))
    : buttons;

  const panel = (
    <UiScrollPanel
      className="spm-scroll-panel"
      tags={tags}
      buttons={sidebarButtons}
      statisticsHtml={statisticsHtml}
      showSearch={showSearch}
      searchPlaceholder={searchPlaceholder}
      searchSubmitUrl={searchSubmitUrl}
      searchParamName={searchParamName}
      width={sidebarWidth}
      onClose={() => setDrawerOpen(false)}
    />
  );

  const viewer = (
    <div
      className="spm-image-viewer-container"
      style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <UiImageViewer
          src={image?.src}
          alt={image?.alt}
          fit={imageFit}
          style={{ height: '100%' }}
        />
      </div>

      {imageButtons.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            background: 'var(--spm-bg-secondary)',
            border: '1px solid var(--spm-border)',
            borderRadius: '999px',
            padding: '6px 12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          {imageButtons.map((btn, i) => {
            const isNav = btn.label.toLowerCase().includes('previous') || btn.label.toLowerCase().includes('next');
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
                  padding: '6px 16px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s, color 0.15s',
                  background: isNav ? 'var(--spm-accent)' : 'transparent',
                  color: isNav ? 'var(--spm-accent-fg)' : 'var(--spm-text-primary)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  if (isNav) {
                    el.style.background = 'var(--spm-accent-hover)';
                  } else {
                    el.style.background = 'var(--spm-bg-tertiary)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  if (isNav) {
                    el.style.background = 'var(--spm-accent)';
                  } else {
                    el.style.background = 'transparent';
                  }
                }}
              >
                {btn.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`spm-split-layout ${className}`.trim()}
      data-drawer-open={drawerOpen ? 'true' : 'false'}
      style={{
        display: 'flex',
        flexDirection: sidebarSide === 'left' ? 'row' : 'row-reverse',
        width: '100%',
        height,
        overflow: 'hidden',
        background: 'var(--spm-bg-primary)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'var(--spm-text-primary)',
        ...style,
      }}
    >
      <style>{`
        @media (max-width: 720px) {
          .spm-split-layout {
            height: 100% !important;
            width: 100% !important;
          }
          .spm-split-layout[data-drawer-open="true"] .spm-scroll-panel {
            display: flex !important;
            flex-direction: column !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 280px !important;
            height: 100vh !important;
            z-index: 99999 !important;
            box-shadow: 0 0 40px rgba(0,0,0,0.8) !important;
            transform: translateX(0) !important;
            transition: transform 0.3s ease !important;
            background: rgba(20, 20, 20, 0.98) !important;
            backdrop-filter: blur(16px) !important;
            border-right: 1px solid var(--spm-border) !important;
            padding: 20px !important;
          }
          .spm-split-layout[data-drawer-open="false"] .spm-scroll-panel {
            display: flex !important;
            flex-direction: column !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 280px !important;
            height: 100vh !important;
            z-index: 99999 !important;
            transform: translateX(-100%) !important;
            transition: transform 0.3s ease !important;
            pointer-events: none !important;
            border-right: none !important;
            padding: 20px !important;
          }
          .spm-split-layout .spm-image-viewer-container {
            width: 100% !important;
            height: 100% !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>
      {panel}
      {viewer}

      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99990,
          }}
        />
      )}

      {isMobile && (
        <button
          onClick={() => setDrawerOpen(prev => !prev)}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--spm-accent)',
            color: 'var(--spm-accent-fg)',
            border: 'none',
            borderRadius: '20px',
            padding: '10px 16px',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: '0 4px 16px rgba(124, 106, 245, 0.4)',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          Search & Tags
        </button>
      )}
    </div>
  );
}
