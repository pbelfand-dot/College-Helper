/**
 * Pure ordering helpers for user-sortable lists (currently activities).
 *
 * Kept separate from persistence so the reorder behaviour is testable without a
 * repository, and so the UI can preview a drag before it is saved.
 */

export interface Sortable {
  id: string;
  sortOrder: number;
}

/** Ascending by sortOrder, with id as a stable tiebreaker. */
export function sortBySortOrder<T extends Sortable>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/**
 * Moves one item to a new index and renumbers the whole list from 0.
 * Returns the reordered items; out-of-range indexes are clamped.
 */
export function moveItem<T extends Sortable>(items: T[], id: string, toIndex: number): T[] {
  const ordered = sortBySortOrder(items);
  const fromIndex = ordered.findIndex((item) => item.id === id);
  if (fromIndex === -1) return ordered;

  const target = Math.min(Math.max(toIndex, 0), ordered.length - 1);
  if (target === fromIndex) return ordered;

  const next = [...ordered];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(target, 0, moved);
  return renumber(next);
}

/** Convenience wrappers used by the up/down buttons in the activity list. */
export function moveUp<T extends Sortable>(items: T[], id: string): T[] {
  const ordered = sortBySortOrder(items);
  const index = ordered.findIndex((item) => item.id === id);
  return index <= 0 ? ordered : moveItem(ordered, id, index - 1);
}

export function moveDown<T extends Sortable>(items: T[], id: string): T[] {
  const ordered = sortBySortOrder(items);
  const index = ordered.findIndex((item) => item.id === id);
  return index === -1 || index === ordered.length - 1 ? ordered : moveItem(ordered, id, index + 1);
}

/** Reassigns contiguous sortOrder values starting at 0. */
export function renumber<T extends Sortable>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, sortOrder: index }));
}

/** The sortOrder a newly created item should take to land at the end. */
export function nextSortOrder(items: Sortable[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.sortOrder)) + 1;
}
