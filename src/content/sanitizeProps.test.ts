import { describe, it, expect } from 'vitest';
import { sanitizeComponentProps } from './sanitizeProps';

describe('sanitizeComponentProps', () => {
  it('should return empty object for null or undefined input', () => {
    expect(sanitizeComponentProps(null as any)).toEqual({});
    expect(sanitizeComponentProps(undefined as any)).toEqual({});
  });

  it('should default undefined array props to empty array []', () => {
    const rawProps = {
      pageTitle: 'Test Page',
      items: undefined,
      tags: null,
      pageLinks: undefined,
      customStyles: undefined
    };

    const clean = sanitizeComponentProps(rawProps);

    expect(clean).toEqual({
      pageTitle: 'Test Page',
      items: [],
      tags: [],
      pageLinks: [],
      customStyles: []
    });
  });

  it('should preserve existing populated array props', () => {
    const rawProps = {
      items: [{ id: '1', title: 'Card 1' }],
      tags: [{ name: 'tag1' }]
    };

    const clean = sanitizeComponentProps(rawProps);

    expect(clean.items).toHaveLength(1);
    expect(clean.tags).toHaveLength(1);
  });
});
