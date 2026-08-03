import { describe, expect, it } from 'vitest';
import {
  moveDown,
  moveItem,
  moveUp,
  nextSortOrder,
  renumber,
  sortBySortOrder,
  type Sortable,
} from '@/lib/domain/ordering';

function list(...ids: string[]): Sortable[] {
  return ids.map((id, index) => ({ id, sortOrder: index }));
}

describe('sortBySortOrder', () => {
  it('sorts ascending and does not mutate the input', () => {
    const input = [
      { id: 'b', sortOrder: 2 },
      { id: 'a', sortOrder: 1 },
    ];
    const sorted = sortBySortOrder(input);
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b']);
    expect(input[0].id).toBe('b');
  });

  it('breaks ties on id so the order is stable', () => {
    const sorted = sortBySortOrder([
      { id: 'z', sortOrder: 0 },
      { id: 'a', sortOrder: 0 },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['a', 'z']);
  });
});

describe('moveItem', () => {
  it('moves an item to a new index and renumbers from zero', () => {
    const result = moveItem(list('a', 'b', 'c', 'd'), 'a', 2);
    expect(result.map((item) => item.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(result.map((item) => item.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it('clamps an index beyond the end', () => {
    const result = moveItem(list('a', 'b', 'c'), 'a', 99);
    expect(result.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('clamps a negative index', () => {
    const result = moveItem(list('a', 'b', 'c'), 'c', -5);
    expect(result.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('returns the sorted list unchanged for an unknown id', () => {
    const result = moveItem(list('a', 'b'), 'missing', 0);
    expect(result.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('returns the same array reference when the move is a no-op', () => {
    const input = list('a', 'b', 'c');
    const result = moveItem(input, 'b', 1);
    expect(result.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('moveUp and moveDown', () => {
  it('moves an item one position up', () => {
    expect(moveUp(list('a', 'b', 'c'), 'c').map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });

  it('moves an item one position down', () => {
    expect(moveDown(list('a', 'b', 'c'), 'a').map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('does nothing at the boundaries', () => {
    expect(moveUp(list('a', 'b'), 'a').map((item) => item.id)).toEqual(['a', 'b']);
    expect(moveDown(list('a', 'b'), 'b').map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('does nothing for an unknown id', () => {
    expect(moveUp(list('a', 'b'), 'nope').map((item) => item.id)).toEqual(['a', 'b']);
    expect(moveDown(list('a', 'b'), 'nope').map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('renumber', () => {
  it('assigns contiguous order values starting at zero', () => {
    const result = renumber([
      { id: 'a', sortOrder: 5 },
      { id: 'b', sortOrder: 11 },
    ]);
    expect(result.map((item) => item.sortOrder)).toEqual([0, 1]);
  });
});

describe('nextSortOrder', () => {
  it('returns zero for an empty list', () => {
    expect(nextSortOrder([])).toBe(0);
  });

  it('returns one past the highest existing value, even with gaps', () => {
    expect(
      nextSortOrder([
        { id: 'a', sortOrder: 0 },
        { id: 'b', sortOrder: 7 },
      ]),
    ).toBe(8);
  });
});
