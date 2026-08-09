export interface UiImageCardProps {
  imageUrl: string;
  linkUrl: string;
  title: string;
  id: string;
  width?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  imageFit?: 'cover' | 'contain';
  showTitle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const RATIO_MAP = {
  square: '1 / 1',
  video: '16 / 9',
  portrait: '3 / 4',
  auto: 'auto',
};

export function UiImageCard({
  imageUrl,
  linkUrl,
  title,
  id,
  width = '160px',
  aspectRatio = 'square',
  imageFit = 'cover',
  showTitle = true,
  className = '',
  style = {},
}: UiImageCardProps) {
  const calculatedRatio = RATIO_MAP[aspectRatio] || '1 / 1';

  return (
    <a
      id={id}
      href={linkUrl}
      className={`spm-image-card ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: `var(--spm-image-card-width, ${width})`,
        borderRadius: 'var(--spm-radius)',
        overflow: 'hidden',
        border: '1px solid var(--spm-border)',
        background: 'var(--spm-bg-secondary)',
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s',
        flexShrink: 0,
        ...style,
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
      <div
        className="spm-image-card-media"
        style={{
          width: '100%',
          aspectRatio: calculatedRatio,
          overflow: 'hidden',
          background: 'var(--spm-bg-tertiary)',
        }}
      >
        <img
          src={imageUrl}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: imageFit,
            display: 'block',
          }}
          loading="lazy"
        />
      </div>
      {showTitle && (
        <div
          className="spm-image-card-caption"
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
      )}
    </a>
  );
}
