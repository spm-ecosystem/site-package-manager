import { UiPostActions } from './UiPostActions';
import { UiTagBadge } from './UiTagBadge';
import { UiSearchBar } from './UiSearchBar';

interface TagItem {
  name: string;
  count: string;
  type: string; // 'tag-type-copyright' | 'tag-type-character' | 'tag-type-artist' | 'tag-type-general' | 'tag-type-faults'
  url: string;
}

interface ActionItem {
  label: string;
  url: string;
}

interface UiPostDetailsProps {
  imageUrl: string;
  actions?: ActionItem[];
  tags?: TagItem[];
  statisticsHtml?: string;
}

export function UiPostDetails({
  imageUrl,
  actions = [],
  tags = [],
  statisticsHtml = '',
}: UiPostDetailsProps) {
  // Normalize tag types from classnames (e.g. "tag-type-artist" or "tag-type-general")
  const copyrightTags = tags.filter(t => t.type.includes('copyright'));
  const characterTags = tags.filter(t => t.type.includes('character'));
  const artistTags = tags.filter(t => t.type.includes('artist'));
  const generalTags = tags.filter(t => t.type.includes('general'));
  const metaTags = tags.filter(t => t.type.includes('metadata') || t.type.includes('meta'));

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
      {/* Sidebar: Search, Tags & Statistics */}
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
        {/* Modern Search directly in the sidebar */}
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
            placeholder="Search tags…"
            submitUrl="https://safebooru.org/index.php?page=post&s=list"
          />
        </div>

        {renderTagGroup('Artists', artistTags)}
        {renderTagGroup('Copyright', copyrightTags)}
        {renderTagGroup('Characters', characterTags)}
        {renderTagGroup('General Tags', generalTags)}
        {renderTagGroup('Meta', metaTags)}

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

      {/* Main Image View */}
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
        {/* Modern actions under the image */}
        <div style={{ width: '100%', maxWidth: '800px', marginBottom: '16px' }}>
          <UiPostActions actions={actions} />
        </div>

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
