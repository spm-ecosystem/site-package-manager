interface Action {
  label: string;
  url: string;
}

interface UiPostActionsProps {
  actions?: Action[];
}

const ICON_MAP: Record<string, string> = {
  previous: '←',
  next: '→',
  saucenao: '🔍',
  similar: '⊞',
  waifu2x: '✨',
};

function getIcon(label: string): string {
  return ICON_MAP[label.toLowerCase().trim()] || '↗';
}

export function UiPostActions({ actions = [] }: UiPostActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '10px 0',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {actions.map((action, i) => {
        const isNav = action.label.toLowerCase() === 'previous' || action.label.toLowerCase() === 'next';
        return (
          <a
            key={i}
            href={action.url}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--spm-radius)',
              fontSize: '12px',
              fontWeight: isNav ? 700 : 500,
              textDecoration: 'none',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              background: isNav ? 'var(--spm-accent)' : 'var(--spm-bg-secondary)',
              color: isNav ? 'var(--spm-accent-fg)' : 'var(--spm-text-primary)',
              border: isNav ? '1px solid var(--spm-accent)' : '1px solid var(--spm-border)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              if (isNav) {
                el.style.background = 'var(--spm-accent-hover)';
              } else {
                el.style.background = 'var(--spm-bg-tertiary)';
                el.style.borderColor = 'var(--spm-accent)';
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              if (isNav) {
                el.style.background = 'var(--spm-accent)';
              } else {
                el.style.background = 'var(--spm-bg-secondary)';
                el.style.borderColor = 'var(--spm-border)';
              }
            }}
          >
            <span style={{ fontSize: '13px', lineHeight: 1 }}>{getIcon(action.label)}</span>
            {action.label}
          </a>
        );
      })}
    </div>
  );
}
