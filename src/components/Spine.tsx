import type { Book } from '../types';
import { getInfo } from '../data/bookLookup';
import { formatRating } from './Stars';

// Book-cloth colours: [background, text]
const PALETTE: [string, string][] = [
  ['#7a1f2b', '#f3e3c3'],
  ['#1f3a5f', '#efe2c4'],
  ['#2f5233', '#f1e6c8'],
  ['#5b3a29', '#f2dfbf'],
  ['#c9a227', '#2a1c0c'],
  ['#3d2b56', '#ecdcc0'],
  ['#9c4a1a', '#f6e7cb'],
  ['#20504f', '#f0e3c5'],
  ['#d8cbb0', '#3a2a1a'],
  ['#2b2b2b', '#d9b45a'],
  ['#8a6e4b', '#fbf1dc'],
  ['#4f6d7a', '#f4ead2'],
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Space between spines, matching `.spine-slot` margin in styles.css. */
export const SPINE_GAP = 2;

/** ~150 pages → 18px, ~1300 pages → 70px (before shelf scaling). */
export function spineWidth(pages?: number) {
  if (!pages) return 34;
  return Math.round(Math.max(18, Math.min(70, 18 + ((pages - 150) * 52) / 1150)));
}

interface Props {
  book: Book;
  /** Thickness multiplier so a full shelf spans the bookcase. */
  scale?: number;
  /** Shown as a badge on the spine. */
  badge?: string;
  active: boolean;
  onActivate: (book: Book, el: HTMLElement) => void;
  onToggle: (book: Book, el: HTMLElement) => void;
  onDeactivate: () => void;
}

export function Spine({ book, scale = 1, badge, active, onActivate, onToggle, onDeactivate }: Props) {
  const info = getInfo(book);
  const h = hash(book.title);
  const [bg, fg] = PALETTE[h % PALETTE.length];
  const width = spineWidth(info.pageCount) * scale;
  const height = 230 + (h % 50);
  const lastName = book.author.split(' ').pop() ?? '';
  // Wide spines fit two lines of title; thin ones get one smaller line.
  const lines = width >= 32 ? 2 : 1;
  const titleSize = Math.max(10, Math.min(14, (width - 8) / (lines * 1.25)));

  return (
    <div className="spine-slot">
      <button
        type="button"
        className={`spine${active ? ' is-active' : ''}`}
        style={{ width, height, background: bg, color: fg }}
        aria-label={`${book.title} by ${book.author}`}
        onMouseEnter={(e) => onActivate(book, e.currentTarget)}
        onMouseLeave={onDeactivate}
        onFocus={(e) => onActivate(book, e.currentTarget)}
        onBlur={onDeactivate}
        onClick={(e) => onToggle(book, e.currentTarget)}
      >
        <span className="spine-band top" />
        {badge && <span className="spine-badge">{badge}</span>}
        <span
          className="spine-title"
          style={{ fontSize: titleSize, whiteSpace: lines === 1 ? 'nowrap' : 'normal' }}
        >
          {book.title}
        </span>
        {width >= 24 && <span className="spine-author">{lastName}</span>}
        <span className="spine-band bottom" />
      </button>
    </div>
  );
}

export const ratingBadge = (n?: number) => (n == null ? undefined : formatRating(n));
