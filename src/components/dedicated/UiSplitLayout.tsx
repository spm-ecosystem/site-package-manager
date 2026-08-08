import { UiImageViewer } from './UiImageViewer';
import { UiScrollPanel } from './UiScrollPanel';

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
}

interface UiSplitLayoutProps {
  // Slot: image — user maps via children[name="imageSlot"] in JSON
  imageSlot?: ImageSlotItem[];
  // Slot: sidebar content — user maps via children in JSON
  tags?: TagItem[];
  buttons?: ButtonItem[];
  statisticsHtml?: string;
  // Layout config — user sets via props in JSON
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

  const imgLabels = ['previous', 'next', 'original image'];
  const imageButtons = splitButtons
    ? buttons.filter(b => imgLabels.some(lbl => b.label.toLowerCase().includes(lbl)))
    : [];
  const sidebarButtons = splitButtons
    ? buttons.filter(b => !imgLabels.some(lbl => b.label.toLowerCase().includes(lbl)))
    : buttons;

  const panel = (
    <UiScrollPanel
      tags={tags}
      buttons={sidebarButtons}
      statisticsHtml={statisticsHtml}
      showSearch={showSearch}
      searchPlaceholder={searchPlaceholder}
      searchSubmitUrl={searchSubmitUrl}
      searchParamName={searchParamName}
      width={sidebarWidth}
    />
  );

  const viewer = (
    <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
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
      className={className}
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
      {panel}
      {viewer}
    </div>
  );
}
