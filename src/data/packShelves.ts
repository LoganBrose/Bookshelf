import type { Book } from '../types';

/**
 * Splits books into shelves of at most `capacity`, keeping each series
 * together. When a series won't fit in the space left on a shelf it moves to
 * the next shelf, and later books in the list fill the gap. A series longer
 * than a whole shelf starts on a fresh shelf and runs onto the next.
 */
export function packShelves(books: Book[], capacity: number): Book[][] {
  // Units in list order: a whole series (placed where its first book is), or one standalone.
  const units: Book[][] = [];
  const seriesUnits = new Map<string, Book[]>();
  for (const b of books) {
    if (!b.series) {
      units.push([b]);
      continue;
    }
    let unit = seriesUnits.get(b.series);
    if (!unit) {
      seriesUnits.set(b.series, (unit = []));
      units.push(unit);
    }
    unit.push(b);
  }
  for (const unit of seriesUnits.values()) {
    unit.sort(
      (a, b) => (a.seriesNumber ?? Infinity) - (b.seriesNumber ?? Infinity) || a.order - b.order,
    );
  }

  const shelves: Book[][] = [];
  while (units.length) {
    const shelf: Book[] = [];
    for (let i = 0; i < units.length && shelf.length < capacity; ) {
      const unit = units[i];
      const space = capacity - shelf.length;
      if (unit.length <= space) {
        shelf.push(...unit);
        units.splice(i, 1);
      } else if (shelf.length === 0) {
        // Too long for any shelf: fill this one and carry the rest over.
        shelf.push(...unit.slice(0, capacity));
        units[i] = unit.slice(capacity);
      } else {
        i++;
      }
    }
    shelves.push(shelf);
  }
  return shelves;
}
