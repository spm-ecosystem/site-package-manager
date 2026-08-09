import { useState } from 'react';

export interface UiSearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  submitUrl?: string;
  queryParamName?: string;
  className?: string;
  style?: React.CSSProperties;
  onSearch?: (value: string) => void;
}

export function UiSearchBar({
  placeholder = 'Search…',
  defaultValue = '',
  submitUrl,
  queryParamName = 'tags',
  className = '',
  style = {},
  onSearch,
}: UiSearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(value);
    } else if (submitUrl) {
      try {
        const url = new URL(submitUrl, window.location.href);
        url.searchParams.set(queryParamName, value);
        window.location.href = url.toString();
      } catch (err) {
        console.error('Invalid submitUrl configured:', err);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--spm-bg-secondary)',
          border: `1px solid ${focused ? 'var(--spm-accent)' : 'var(--spm-border)'}`,
          borderRadius: 'var(--spm-radius)',
          padding: '0 8px',
          transition: 'border-color 0.15s',
          minWidth: 0,
        }}
      >
        <button
          type="submit"
          style={{
            background: 'none',
            border: 'none',
            padding: '0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            color: focused ? 'var(--spm-accent)' : 'var(--spm-text-muted)',
            transition: 'color 0.15s',
          }}
          aria-label="Search"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--spm-text-primary)',
            fontSize: '12px',
            padding: '8px 0',
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
              fontSize: '11px',
              flexShrink: 0,
            }}
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>
    </form>
  );
}
