import React from 'react';

export interface ColumnConfig<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => React.ReactNode;
}

interface UiTableProps<T> {
  columns: ColumnConfig<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function UiTable<T>({ columns, data, onRowClick, className = '', style = {} }: UiTableProps<T>) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: 'var(--spm-radius)',
        border: '1px solid var(--spm-border)',
        background: 'var(--spm-bg-secondary)',
        ...style,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
          textAlign: 'left',
          color: 'var(--spm-text-primary)',
          fontFamily: 'inherit',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--spm-border)',
              background: 'var(--spm-bg-tertiary)',
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--spm-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: col.width,
                  textAlign: col.align || 'left',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: 'var(--spm-text-muted)',
                }}
              >
                No items found.
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick && onRowClick(item)}
                style={{
                  borderBottom: rowIdx === data.length - 1 ? 'none' : '1px solid var(--spm-border)',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--spm-bg-tertiary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    style={{
                      padding: '16px',
                      verticalAlign: 'middle',
                      textAlign: col.align || 'left',
                    }}
                  >
                    {col.render ? col.render(item) : String((item as any)[col.key] || '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
