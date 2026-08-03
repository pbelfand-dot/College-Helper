import { describe, expect, it } from 'vitest';
import { countCharacters, countWords, evaluateCount, formatCount } from '@/lib/domain/counting';

describe('countWords', () => {
  it('counts whitespace-separated tokens', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('treats empty and whitespace-only text as zero', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n\t  ')).toBe(0);
  });

  it('ignores repeated whitespace and newlines', () => {
    expect(countWords('one   two\n\nthree\tfour')).toBe(4);
  });

  it('counts a hyphenated word once, as application portals describe it', () => {
    expect(countWords('well-known problem')).toBe(2);
  });
});

describe('countCharacters', () => {
  it('counts plain characters', () => {
    expect(countCharacters('hello')).toBe(5);
  });

  it('counts whitespace', () => {
    expect(countCharacters('a b')).toBe(3);
  });

  it('counts an emoji as one character rather than two code units', () => {
    expect(countCharacters('🌊')).toBe(1);
    expect('🌊'.length).toBe(2);
  });

  it('counts accented characters as one', () => {
    expect(countCharacters('café')).toBe(4);
  });
});

describe('evaluateCount', () => {
  it('reports no limit when the type is none', () => {
    const state = evaluateCount('some words here', 'none', null);
    expect(state.limit).toBeNull();
    expect(state.remaining).toBeNull();
    expect(state.over).toBe(false);
    expect(state.percentUsed).toBeNull();
  });

  it('treats a missing limit value as unlimited', () => {
    const state = evaluateCount('some words', 'words', null);
    expect(state.limit).toBeNull();
    expect(state.used).toBe(2);
  });

  it('computes remaining words against the configured limit', () => {
    const state = evaluateCount('one two three', 'words', 10);
    expect(state.used).toBe(3);
    expect(state.remaining).toBe(7);
    expect(state.over).toBe(false);
    expect(state.percentUsed).toBe(30);
  });

  it('reports going over as a negative remainder rather than clamping', () => {
    const state = evaluateCount('one two three four', 'words', 2);
    expect(state.over).toBe(true);
    expect(state.remaining).toBe(-2);
  });

  it('flags nearing the limit at 90 percent, but not once over', () => {
    expect(evaluateCount('a'.repeat(95), 'characters', 100).nearLimit).toBe(true);
    expect(evaluateCount('a'.repeat(50), 'characters', 100).nearLimit).toBe(false);
    expect(evaluateCount('a'.repeat(120), 'characters', 100).nearLimit).toBe(false);
  });

  it('counts characters when the limit type is characters', () => {
    const state = evaluateCount('hello world', 'characters', 150);
    expect(state.used).toBe(11);
  });
});

describe('formatCount', () => {
  it('includes the limit when there is one', () => {
    expect(formatCount(evaluateCount('one two', 'words', 650))).toBe('2 / 650 words');
  });

  it('omits the limit when unlimited', () => {
    expect(formatCount(evaluateCount('one two', 'none', null))).toBe('2 words');
  });

  it('uses the right unit for characters', () => {
    expect(formatCount(evaluateCount('abc', 'characters', 150))).toBe('3 / 150 characters');
  });
});
