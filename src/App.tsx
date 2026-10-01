import { useEffect, useMemo, useRef, useState } from 'react';
import type { Book } from './types';
import { useBooks } from './hooks/useBooks';
import { getInfo, useBookInfos } from './data/bookLookup';
import { Bookcase } from './components/Bookcase';
import { packShelves } from './data/packShelves';
import { ratingBadge } from './components/Spine';
import { CoverPopover } from './components/CoverPopover';
import { Rankings } from './components/Rankings';
import { formatRating } from './components/Stars';

type Tab = 'shelf' | 'rankings' | 'tbr';
type GroupBy = 'genre' | 'author';

const DEFAULT_PER_SHELF = 12;
const MIN_PER_SHELF = 6;
const MAX_PER_SHELF = 20;
const NO_GENRE = 'Uncategorized';

function usePersisted<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T) || initial;
    } catch {
      return initial;
    }
  });
  return [
    v,
    (next: T) => {
      setV(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        /* ignore */
      }
    },
  ];
}

function groupBooks(books: Book[], by: GroupBy) {
  const groups = new Map<string, Book[]>();
  const add = (k: string, b: Book) => groups.set(k, [...(groups.get(k) ?? []), b]);
  for (const b of books) {
    if (by === 'author') add(b.author || 'Unknown author', b);
    else (b.genres.length ? b.genres : [NO_GENRE]).forEach((g) => add(g, b));
  }
  // Books stay in sheet order; packShelves keeps each series together.
  return [...groups.entries()]
    .map(([label, list]) => ({ label, books: list }))
    .sort((a, b) => {
      const last = (l: string) => l === NO_GENRE;
      if (last(a.label) !== last(b.label)) return last(a.label) ? 1 : -1;
      return a.label.replace(/^the\s+/i, '').localeCompare(b.label.replace(/^the\s+/i, ''));
    });
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function summary(books: Book[]) {
  const rated = books.filter((b) => b.rating != null);
  const avg = rated.length ? rated.reduce((s, b) => s + b.rating!, 0) / rated.length : undefined;
  const parts = [`${books.length} book${books.length === 1 ? '' : 's'}`];
  if (avg != null) parts.push(`avg ${formatRating(avg)}`);
  return parts.join(' · ');
}

export function App() {
  const { read, tbr, loading, error } = useBooks();
  const [tab, setTab] = usePersisted<Tab>('bookshelf.tab', 'shelf');
  const [savedGroupBy, setGroupBy] = usePersisted<GroupBy>('bookshelf.groupBy', 'genre');
  // Older visits may have saved 'series', which is no longer an option.
  const groupBy: GroupBy = savedGroupBy === 'author' ? 'author' : 'genre';
  const [savedPerShelf, setSavedPerShelf] = usePersisted('bookshelf.perShelf', String(DEFAULT_PER_SHELF));
  const perShelf = Math.min(
    MAX_PER_SHELF,
    Math.max(MIN_PER_SHELF, parseInt(savedPerShelf, 10) || DEFAULT_PER_SHELF),
  );
  const setPerShelf = (n: number) => setSavedPerShelf(String(n));
  const [tbrSort, setTbrSort] = usePersisted<'sheet' | 'rating'>('bookshelf.tbrSort', 'sheet');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<{ book: Book; el: HTMLElement; kind: 'read' | 'tbr' }>();
  const activatedAt = useRef(0);

  const allBooks = useMemo(() => [...read, ...tbr], [read, tbr]);
  useBookInfos(allBooks);

  // Close the popover on scroll / taps elsewhere (its position is fixed).
  useEffect(() => {
    if (!active) return;
    const close = (e: Event) => {
      if (e.type === 'pointerdown' && (e.target as HTMLElement).closest?.('.spine')) return;
      setActive(undefined);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('pointerdown', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('pointerdown', close);
    };
  }, [active]);

  const handlers = (kind: 'read' | 'tbr') => {
    const isActive = (book: Book, el: HTMLElement) => active?.book.id === book.id && active.el === el;
    const open = (book: Book, el: HTMLElement) => {
      if (isActive(book, el)) return;
      activatedAt.current = Date.now();
      setActive({ book, el, kind });
    };
    return {
      activeId: active?.book.id,
      onActivate: open,
      // A tap fires hover, focus and click together; only a later tap closes it.
      onToggle: (book: Book, el: HTMLElement) => {
        if (isActive(book, el) && Date.now() - activatedAt.current > 400) setActive(undefined);
        else open(book, el);
      },
      onDeactivate: () => setActive(undefined),
    };
  };

  const q = query.trim().toLowerCase();
  const filteredRead = q
    ? read.filter((b) =>
        [b.title, b.author, b.series, ...b.genres].some((s) => s.toLowerCase().includes(q)),
      )
    : read;

  const tbrShelves =
    tbrSort === 'rating'
      ? chunk(
          [...tbr].sort(
            (a, b) => (getInfo(b).webRating ?? -1) - (getInfo(a).webRating ?? -1) || a.order - b.order,
          ),
          perShelf,
        )
      : packShelves(tbr, perShelf);

  const stepper = (
    <div className="stepper" aria-label="Books per shelf">
      <span className="segmented-label">Per shelf</span>
      <button
        aria-label="Fewer books per shelf"
        disabled={perShelf <= MIN_PER_SHELF}
        onClick={() => setPerShelf(perShelf - 1)}
      >
        −
      </button>
      <span className="stepper-value">{perShelf}</span>
      <button
        aria-label="More books per shelf"
        disabled={perShelf >= MAX_PER_SHELF}
        onClick={() => setPerShelf(perShelf + 1)}
      >
        +
      </button>
    </div>
  );

  const totalPages = read.reduce((s, b) => s + (getInfo(b).pageCount ?? 0), 0);

  return (
    <div className="app">
      <header className="masthead">
        <h1>My Bookshelf</h1>
        <p className="tagline">
          {read.length} read
          {totalPages > 0 && ` · ${totalPages.toLocaleString()} pages`} · {tbr.length} to be read
        </p>
        <nav className="tabs" role="tablist">
          {(
            [
              ['shelf', 'Bookshelf'],
              ['rankings', 'Rankings'],
              ['tbr', 'TBR'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'is-selected' : ''}
              onClick={() => {
                setActive(undefined);
                setTab(id);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {loading && <p className="status">Pulling books off the shelf…</p>}
        {error && <p className="status error">{error}</p>}

        {!loading && !error && tab === 'shelf' && (
          <>
            <div className="toolbar">
              <div className="segmented" role="radiogroup" aria-label="Group by">
                <span className="segmented-label">Group by</span>
                {(['genre', 'author'] as const).map((g) => (
                  <button
                    key={g}
                    role="radio"
                    aria-checked={groupBy === g}
                    className={groupBy === g ? 'is-selected' : ''}
                    onClick={() => setGroupBy(g)}
                  >
                    {g[0].toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
              {stepper}
              <input
                className="search"
                type="search"
                placeholder="Search title, author, series…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {filteredRead.length === 0 && <p className="status">No books match “{query}”.</p>}
            {groupBooks(filteredRead, groupBy).map((g) => (
              <Bookcase
                key={g.label}
                label={g.label}
                sublabel={summary(g.books)}
                shelves={packShelves(g.books, perShelf)}
                capacity={perShelf}
                badge={(b) => ratingBadge(b.rating)}
                {...handlers('read')}
              />
            ))}
          </>
        )}

        {!loading && !error && tab === 'rankings' && <Rankings books={read} />}

        {!loading && !error && tab === 'tbr' && (
          <>
            <div className="toolbar">
              <div className="segmented" role="radiogroup" aria-label="Sort">
                <span className="segmented-label">Sort</span>
                {(
                  [
                    ['sheet', 'My order'],
                    ['rating', 'Highest rated'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={tbrSort === id}
                    className={tbrSort === id ? 'is-selected' : ''}
                    onClick={() => setTbrSort(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {stepper}
              <p className="muted toolbar-note">Ratings out of 5 from Open Library / Google Books</p>
            </div>
            {tbr.length === 0 ? (
              <p className="status">Your TBR shelf is empty.</p>
            ) : (
              <Bookcase
                label="To Be Read"
                sublabel={`${tbr.length} book${tbr.length === 1 ? '' : 's'} waiting`}
                shelves={tbrShelves}
                capacity={perShelf}
                badge={(b) => {
                  const r = getInfo(b).webRating;
                  return r == null ? undefined : `${formatRating(r)}★`;
                }}
                {...handlers('tbr')}
              />
            )}
          </>
        )}
      </main>

      {active && <CoverPopover book={active.book} anchor={active.el} kind={active.kind} />}
    </div>
  );
}
