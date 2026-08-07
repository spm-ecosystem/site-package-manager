interface UiImageCardProps {
  imageUrl: string;
  linkUrl: string;
  title: string;
  id: string;
}

export function UiImageCard({ imageUrl, linkUrl, title, id }: UiImageCardProps) {
  return (
    <a
      id={id}
      href={linkUrl}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '160px',
        borderRadius: 'var(--spm-radius)',
        overflow: 'hidden',
        border: '1px solid var(--spm-border)',
        background: 'var(--spm-bg-secondary)',
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--spm-accent)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--spm-border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{ width: '100%', height: '128px', overflow: 'hidden', background: 'var(--spm-bg-tertiary)' }}>
        <img
          src={imageUrl}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
      </div>
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid var(--spm-border)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: 'var(--spm-text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
          title={title}
        >
          {title}
        </p>
      </div>
    </a>
  );
}
