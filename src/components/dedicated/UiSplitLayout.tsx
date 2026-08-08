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
  showSearch = false,
  searchPlaceholder = 'Search…',
  searchSubmitUrl,
  searchParamName = 'q',
  className = '',
  style = {},
}: UiSplitLayoutProps) {
  const image = imageSlot[0];

  const panel = (
    <UiScrollPanel
      tags={tags}
      buttons={buttons}
      statisticsHtml={statisticsHtml}
      showSearch={showSearch}
      searchPlaceholder={searchPlaceholder}
      searchSubmitUrl={searchSubmitUrl}
      searchParamName={searchParamName}
      width={sidebarWidth}
    />
  );

  const viewer = (
    <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
      <UiImageViewer
        src={image?.src}
        alt={image?.alt}
        fit={imageFit}
        style={{ height: '100%' }}
      />
    </div>
  );

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: sidebarSide === 'left' ? 'row' : 'row-reverse',
        width: '100%',
        height: '100vh',
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
