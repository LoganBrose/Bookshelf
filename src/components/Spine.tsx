import { useRef } from 'react';
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

// Series colour assignments, made in sheet order so different series get
// different colours until the palette runs out.
const seriesColor = new Map<string, number>();

export function assignSeriesColors(books: Book[]) {
  seriesColor.clear();
  for (const b of books) {
    if (b.series && !seriesColor.has(b.series)) {
      seriesColor.set(b.series, seriesColor.size % PALETTE.length);
    }
  }
}

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
  /** The spine element the popover is open for; only that copy of a book is highlighted. */
  activeEl?: HTMLElement;
  onActivate: (book: Book, el: HTMLElement) => void;
  onToggle: (book: Book, el: HTMLElement) => void;
  onDeactivate: () => void;
}

export function Spine({ book, scale = 1, badge, activeEl, onActivate, onToggle, onDeactivate }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const active = activeEl != null && activeEl === ref.current;
  const info = getInfo(book);
  // Books in a series share a colour and height, like a matching set.
  const setKey = hash(book.series || book.title);
  const [bg, fg] = PALETTE[seriesColor.get(book.series) ?? setKey % PALETTE.length];
  const width = spineWidth(info.pageCount) * scale;
  const height = 230 + (setKey % 50);
  const lastName = book.author.split(' ').pop() ?? '';
  // Show the author's name unless dropping it lets a cramped title grow noticeably.
  let showAuthor = width >= 24;
  let { titleSize, lines } = fitTitle(book.title, width, height, showAuthor ? lastName : '');
  if (showAuthor && titleSize < 16) {
    const bare = fitTitle(book.title, width, height, '');
    if (bare.titleSize - titleSize >= 3) {
      ({ titleSize, lines } = bare);
      showAuthor = false;
    }
  }

  return (
    <div className="spine-slot">
      <button
        ref={ref}
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
        {showAuthor && <span className="spine-author">{lastName}</span>}
        <span className="spine-band bottom" />
      </button>
    </div>
  );
}

/**
 * Largest title font (and line count) that fits the spine: each line has to
 * fit the spine's length, and all lines together its width.
 */
function fitTitle(title: string, width: number, height: number, author: string) {
  const free = height - 26 - 24 - (author ? author.length * 8 + 10 : 0) - 12;
  // A line can't be shorter than the longest word, since words don't break.
  const longestWord = Math.max(...title.split(/\s+/).map((w) => w.length));
  let best = { titleSize: 10, lines: 1 };
  for (let lines = 1; lines <= 3; lines++) {
    const lineChars = Math.max(longestWord, title.length / lines);
    const byWidth = (width - 8) / (lines * 1.12);
    const byLength = free / ((lineChars + 1.5) * 0.62);
    const size = Math.min(MAX_TITLE, byWidth, byLength);
    if (size > best.titleSize) best = { titleSize: size, lines };
  }
  return best;
}

const MAX_TITLE = 24;

export const ratingBadge = (n?: number) => (n == null ? undefined : formatRating(n));
