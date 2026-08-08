// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { extractValue } from '../src/content/engine';

describe('extractValue engine helper', () => {
  it('should extract text content from child', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span>Hello World</span>';
    const result = extractValue(div, 'span | text');
    expect(result).toBe('Hello World');
  });

  it('should extract attributes from child element', () => {
    const div = document.createElement('div');
    div.innerHTML = '<img src="https://example.com/img.jpg">';
    const result = extractValue(div, 'img | attr:src');
    expect(result).toBe('https://example.com/img.jpg');
  });

  it('should extract properties from self element', () => {
    const div = document.createElement('div');
    div.id = 'target-id';
    const result = extractValue(div, 'self | attr:id');
    expect(result).toBe('target-id');
  });

  it('should return null when selector is not matched', () => {
    const div = document.createElement('div');
    const result = extractValue(div, 'p | text');
    expect(result).toBeNull();
  });

  it('should extract URL from onclick if href is #', () => {
    const div = document.createElement('div');
    div.innerHTML = '<a href="#" onclick="document.location=\'index.php?id=123\'; return false;">Link</a>';
    const result = extractValue(div, 'a | hrefOrOnclick');
    expect(result).toBe('index.php?id=123');
  });
});
