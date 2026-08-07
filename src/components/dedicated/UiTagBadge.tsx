interface UiTagBadgeProps {
  label: string;
  count?: string | number;
  href?: string;
}

export function UiTagBadge({ label, count, href }: UiTagBadgeProps) {
  const inner = (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer"
      style={{
        background: 'var(--spm-bg-tertiary)',
        color: 'var(--spm-text-primary)',
        border: '1px solid var(--spm-border)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--spm-accent)';
        (e.currentTarget as HTMLElement).style.color = 'var(--spm-accent-fg)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--spm-accent)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--spm-bg-tertiary)';
        (e.currentTarget as HTMLElement).style.color = 'var(--spm-text-primary)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--spm-border)';
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ color: 'var(--spm-text-muted)', fontSize: '10px' }}>
          {count}
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <a href={href} style={{ textDecoration: 'none' }}>
        {inner}
      </a>
    );
  }

  return inner;
}
