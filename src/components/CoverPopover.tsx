import { useLayoutEffect, useRef, useState } from 'react';
import type { Book } from '../types';
import { getInfo } from '../data/bookLookup';
import { Cover } from './Cover';
import { Stars, formatCount, formatRating } from './Stars';

interface Props {
  book: Book;
  anchor: HTMLElement;
  kind: 'read' | 'tbr';
}

const GAP = 14;

export function CoverPopover({ book, anchor, kind }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>();
  const info = getInfo(book);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = anchor.getBoundingClientRect();
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = a.right + GAP;
    if (left + width > vw - 8) left = a.left - GAP - width;
    if (left < 8) left = Math.max(8, Math.min(vw - width - 8, a.left + a.width / 2 - width / 2));
    let top = a.top + a.height / 2 - height / 2;
    top = Math.max(8, Math.min(vh - height - 8, top));
    setPos({ left, top });
  }, [anchor, book, info.coverUrl, info.pageCount, info.webRating]);

  return (
    <div
      ref={ref}
      className="popover"
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden', left: 0, top: 0 }}
    >
      <Cover book={book} url={info.coverUrl} className="popover-cover" />
      <div className="popover-body">
        <h3>{book.title}</h3>
        <p className="popover-author">{book.author}</p>
        {book.series && (
          <p className="popover-meta">
            {book.series}
            {book.seriesNumber != null && ` · Book ${book.seriesNumber}`}
          </p>
        )}
        <p className="popover-meta">
          {[book.genres.join(', '), info.pageCount && `${info.pageCount.toLocaleString()} pages`]
            .filter(Boolean)
            .join(' · ')}
          {!info.loaded && !info.pageCount && <span className="muted"> · looking up…</span>}
        </p>
        {kind === 'read' && book.rating != null && (
          <div className="popover-rating">
            <Stars value={book.rating} max={10} size={14} />
            <span className="popover-score">
              <strong>{formatRating(book.rating)}</strong> <span className="muted">/ 10</span>
            </span>
          </div>
        )}
        {kind === 'tbr' && <WebRating book={book} />}
        {book.dateRead && <p className="popover-meta">Read {book.dateRead}</p>}
      </div>
    </div>
  );
}

export function WebRating({ book, size = 15 }: { book: Book; size?: number }) {
  const info = getInfo(book);
  if (info.webRating == null) {
    return <p className="popover-meta muted">{info.loaded ? 'No web rating yet' : 'Fetching rating…'}</p>;
  }
  return (
    <div className="popover-rating">
      <Stars value={info.webRating} max={5} size={size} />
      <strong>{formatRating(info.webRating)}</strong>
      <span className="muted">
        {info.ratingsCount ? `${formatCount(info.ratingsCount)} ratings` : ''}
        {info.ratingSource ? ` · ${info.ratingSource}` : ''}
      </span>
    </div>
  );
}
