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
const MAX_SCALE = 4;

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

  // Every shelf but the last is scaled to span the bookcase exactly (a shelf can
  // be short of `capacity` when a series moved down). The last shelf uses the
  // others' average scale so it doesn't stretch; with only one shelf, scale is
  // estimated from this bookcase's average book.
  const clamp = (n: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, n));
  const widths = shelves.map((shelf) =>
    shelf.reduce((sum, b) => sum + spineWidth(getInfo(b).pageCount), 0),
  );
  const last = shelves.length - 1;
  // Spine space on a shelf: its width less the gaps between its books.
  const fillScale = (i: number) =>
    clamp((rowWidth - shelves[i].length * SPINE_GAP - 4) / widths[i]);
  const filledScales = widths.slice(0, last).map((_, i) => fillScale(i));
  const bookCount = shelves.reduce((n, s) => n + s.length, 0);
  const lastScale = filledScales.length
    ? filledScales.reduce((a, b) => a + b, 0) / filledScales.length
    : shelves[last]?.length >= capacity
      ? fillScale(last)
      : clamp(
          (rowWidth - capacity * SPINE_GAP - 4) /
            ((widths.reduce((a, b) => a + b, 0) / Math.max(1, bookCount)) * capacity),
        );
  const scaleFor = (i: number) =>
    !rowWidth || !widths[i]
      ? 1
      : i < last || shelves[i].length >= capacity
        ? fillScale(i)
        : lastScale;

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
              scale={scaleFor(i)}
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
