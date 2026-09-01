import { describe, it, expect } from 'vitest';
import { sanitizeComponentProps } from './sanitizeProps';

describe('sanitizeComponentProps (Real Data & Edge Case Validation)', () => {
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

  it('should preserve real extracted data from Safebooru manifest without mutation', () => {
    const realSafebooruProps = {
      pageTitle: 'Safebooru',
      gridItems: [
        { imageUrl: 'https://safebooru.org/thumbnails/1000/thumbnail_1001.jpg', postUrl: 'index.php?page=post&s=view&id=1001', itemSelector: '#s1001' },
        { imageUrl: 'https://safebooru.org/thumbnails/1000/thumbnail_1002.jpg', postUrl: 'index.php?page=post&s=view&id=1002', itemSelector: '#s1002' }
      ],
      tags: [
        { tagName: 'artist_name', tagUrl: 'index.php?page=post&s=list&tags=artist_name', count: '1.2k' },
        { tagName: 'character_name', tagUrl: 'index.php?page=post&s=list&tags=character_name', count: '5.4k' }
      ]
    };

    const clean = sanitizeComponentProps(realSafebooruProps);

    expect(clean.pageTitle).toBe('Safebooru');
    expect(clean.gridItems).toHaveLength(2);
    expect(clean.gridItems[0].imageUrl).toContain('thumbnail_1001.jpg');
    expect(clean.tags).toHaveLength(2);
    expect(clean.tags[0].tagName).toBe('artist_name');
  });

  it('should NOT convert scalar string props ending in "s" (e.g. status, address) to empty arrays when undefined', () => {
    const rawProps = {
      status: undefined,
      address: undefined,
      pageTitle: 'Sample'
    };

    const clean = sanitizeComponentProps(rawProps);

    expect(clean.status).toBeUndefined();
    expect(clean.address).toBeUndefined();
    expect(clean.pageTitle).toBe('Sample');
  });

  it('should parse CSS string style props into React camelCase CSSProperties objects', () => {
    const rawProps = {
      title: 'Form Title',
      style: 'max-width: 480px; margin: 40px auto; opacity: 0.9;',
    };

    const clean = sanitizeComponentProps(rawProps);

    expect(clean.style).toEqual({
      maxWidth: '480px',
      margin: '40px auto',
      opacity: '0.9',
    });
  });
});
