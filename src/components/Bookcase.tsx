import { useLayoutEffect, useRef, useState } from 'react';
import type { Book } from '../types';
import { getInfo } from '../data/bookLookup';
import { Spine, SPINE_GAP, spineWidth } from './Spine';

interface Props {
  label: string;
  sublabel?: string;
  shelves: Book[][];
  /** Books per full shelf; spines are scaled so a full shelf spans the bookcase. */
  capacity: number;
  badge: (b: Book) => string | undefined;
  activeId?: string;
  onActivate: (book: Book, el: HTMLElement) => void;
  onToggle: (book: Book, el: HTMLElement) => void;
  onDeactivate: () => void;
}

// Never shrink below natural thickness (narrow screens wrap instead).
const MIN_SCALE = 1;
const MAX_SCALE = 2.5;

export function Bookcase({ label, sublabel, shelves, capacity, badge, activeId, ...handlers }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [rowWidth, setRowWidth] = useState(0);

  useLayoutEffect(() => {
    const row = ref.current?.querySelector('.shelf-row');
    if (!row) return;
    const measure = () => {
      const style = getComputedStyle(row);
      setRowWidth(row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, []);

  // Natural spine width of a full shelf (gaps excluded, as they don't scale):
  // the widest full shelf here, or an estimate from this bookcase's average book.
  const widths = shelves.map((shelf) =>
    shelf.reduce((sum, b) => sum + spineWidth(getInfo(b).pageCount), 0),
  );
  const fullShelves = widths.filter((_, i) => shelves[i].length >= capacity);
  const bookCount = shelves.reduce((n, s) => n + s.length, 0);
  const fullWidth = fullShelves.length
    ? Math.max(...fullShelves)
    : (widths.reduce((a, b) => a + b, 0) / Math.max(1, bookCount)) * capacity;
  const available = rowWidth - capacity * SPINE_GAP - 4;
  const scale =
    rowWidth && fullWidth ? Math.max(MIN_SCALE, Math.min(MAX_SCALE, available / fullWidth)) : 1;

  return (
    <section className="bookcase" ref={ref}>
      <header className="shelf-plaque">
        <h2>{label}</h2>
        {sublabel && <span>{sublabel}</span>}
      </header>
      {shelves.map((books, i) => (
        <div className="shelf-row" key={i}>
          {books.map((b) => (
            <Spine
              key={b.id}
              book={b}
              scale={scale}
              badge={badge(b)}
              active={activeId === b.id}
              {...handlers}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
