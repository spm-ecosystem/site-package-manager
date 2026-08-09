export interface UiImageViewerProps {
  src?: string;
  alt?: string;
  fit?: 'contain' | 'cover';
  background?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function UiImageViewer({
  src,
  alt = '',
  fit = 'contain',
  background,
  className = '',
  style = {},
}: UiImageViewerProps) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: background ?? 'var(--spm-bg-primary)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: fit,
            display: 'block',
          }}
        />
      ) : (
        <span style={{ color: 'var(--spm-text-muted)', fontSize: '13px' }}>
          No image
        </span>
      )}
    </div>
  );
}
