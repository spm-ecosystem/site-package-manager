import { UiImageCard } from './UiImageCard';

interface GridItem {
  imageUrl: string;
  linkUrl: string;
  title: string;
  id: string;
}

interface UiModernGridPageProps {
  pageTitle: string;
  items: GridItem[];
}

export function UiModernGridPage({ pageTitle, items }: UiModernGridPageProps) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--spm-bg-primary)',
        color: 'var(--spm-text-primary)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Sidebar slot — legacy nodes reparented here */}
      <aside
        id="sidebarSlot-container"
        style={{
          width: '220px',
          flexShrink: 0,
          borderRight: '1px solid var(--spm-border)',
          background: 'var(--spm-bg-secondary)',
          padding: '16px',
          overflowY: 'auto',
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--spm-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--spm-text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {pageTitle || 'Gallery'}
            </h1>
          </div>
        </header>

        {/* Grid */}
        <main
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
          {items.length === 0 ? (
            <div style={{ color: 'var(--spm-text-muted)', fontSize: '14px', margin: 'auto' }}>
              No items found.
            </div>
          ) : (
            items.map(item => (
              <UiImageCard
                key={item.id}
                id={item.id}
                imageUrl={item.imageUrl}
                linkUrl={item.linkUrl}
                title={item.title}
              />
            ))
          )}
        </main>
      </div>
    </div>
  );
}
