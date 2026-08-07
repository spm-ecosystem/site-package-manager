import { useState } from 'react';

interface UiSearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  submitUrl?: string;
  onSearch?: (value: string) => void;
}

export function UiSearchBar({
  placeholder = 'Search…',
  defaultValue = '',
  submitUrl,
  onSearch,
}: UiSearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(value);
    } else if (submitUrl) {
      const url = new URL(submitUrl, window.location.href);
      url.searchParams.set('tags', value);
      window.location.href = url.toString();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--spm-bg-secondary)',
          border: '1px solid var(--spm-border)',
          borderRadius: 'var(--spm-radius)',
          padding: '0 12px',
          transition: 'border-color 0.15s',
        }}
        onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--spm-accent)'}
        onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--spm-border)'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: 'var(--spm-text-muted)', flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--spm-text-primary)',
            fontSize: '13px',
            padding: '10px 0',
            fontFamily: 'inherit',
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--spm-text-muted)',
              padding: '0',
              lineHeight: 1,
              fontSize: '14px',
            }}
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>
      <button
        type="submit"
        style={{
          background: 'var(--spm-accent)',
          color: 'var(--spm-accent-fg)',
          border: 'none',
          borderRadius: 'var(--spm-radius)',
          padding: '10px 16px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--spm-accent-hover)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--spm-accent)'}
      >
        Search
      </button>
    </form>
  );
}
