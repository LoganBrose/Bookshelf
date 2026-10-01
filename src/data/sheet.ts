import Papa from 'papaparse';
import type { Book } from '../types';

type Row = Record<string, string>;

const ALIASES: Record<string, string[]> = {
  title: ['title', 'book', 'book title', 'name'],
  author: ['author', 'authors', 'by'],
  series: ['series', 'series name'],
  seriesNumber: ['series #', 'series number', 'book #', '#', 'number', 'no'],
  genre: ['genre', 'genres'],
  rating: ['rating', 'my rating', 'score', 'stars'],
  dateRead: ['date read', 'date finished', 'finished', 'date'],
  pages: ['pages', 'page count', 'length'],
  coverUrl: ['cover', 'cover url', 'image'],
};

const normHeader = (h: string) => h.trim().toLowerCase().replace(/\s+/g, ' ');

function pick(row: Row, field: keyof typeof ALIASES): string {
  for (const alias of ALIASES[field]) {
    const v = row[alias];
    if (v != null && v.trim() !== '') return v.trim().replace(/\s+/g, ' ');
  }
  return '';
}

/** "8.4" → 8.4, "4/5" → 8 (scaled to 10), "★★★★" → 8. */
function parseRating(raw: string): number | undefined {
  if (!raw) return undefined;
  const stars = (raw.match(/★/g) ?? []).length;
  if (stars) return stars * 2;
  const frac = raw.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
  if (frac) return (parseFloat(frac[1]) / parseFloat(frac[2])) * 10;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

const parseNum = (raw: string) => {
  const n = parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

export function parseBooks(csv: string, prefix: string): Book[] {
  const { data } = Papa.parse<Row>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normHeader,
  });
  return data
    .map((row, i) => {
      const title = pick(row, 'title');
      const genre = pick(row, 'genre');
      return {
        id: `${prefix}-${i}`,
        title,
        author: pick(row, 'author'),
        series: pick(row, 'series'),
        seriesNumber: parseNum(pick(row, 'seriesNumber')),
        genres: genre ? genre.split(/[,/;]/).map((g) => g.trim()).filter(Boolean) : [],
        rating: parseRating(pick(row, 'rating')),
        dateRead: pick(row, 'dateRead') || undefined,
        pages: parseNum(pick(row, 'pages')),
        coverUrl: pick(row, 'coverUrl') || undefined,
        order: i,
      } satisfies Book;
    })
    .filter((b) => b.title);
}

// ---- Typo-tolerant name clustering -------------------------------------

const clusterKey = (s: string) =>
  s.toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '');

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/**
 * Merges near-identical names (case, spacing, "The", small typos) and
 * rewrites each to the most common spelling. Ties go to the first seen.
 */
function unifyNames(books: Book[], get: (b: Book) => string, set: (b: Book, v: string) => void) {
  const clusters: { key: string; counts: Map<string, number> }[] = [];
  const assignment = new Map<Book, (typeof clusters)[number]>();
  for (const b of books) {
    const name = get(b);
    if (!name) continue;
    const key = clusterKey(name);
    let c = clusters.find(
      (c) => c.key === key || (key.length > 5 && levenshtein(c.key, key) <= 2),
    );
    if (!c) clusters.push((c = { key, counts: new Map() }));
    c.counts.set(name, (c.counts.get(name) ?? 0) + 1);
    assignment.set(b, c);
  }
  for (const [b, c] of assignment) {
    let best = '';
    let bestCount = 0;
    for (const [name, count] of c.counts) if (count > bestCount) [best, bestCount] = [name, count];
    set(b, best);
  }
}

/** Cleans names consistently across both tabs so groups line up. */
export function normalizeBooks(read: Book[], tbr: Book[]) {
  const all = [...read, ...tbr];
  unifyNames(all, (b) => b.series, (b, v) => (b.series = v));
  unifyNames(all, (b) => b.author, (b, v) => (b.author = v));
  const genreCanon = new Map<string, string>();
  for (const b of all) {
    b.genres = b.genres.map((g) => {
      const k = g.toLowerCase();
      if (!genreCanon.has(k)) genreCanon.set(k, g);
      return genreCanon.get(k)!;
    });
  }
}
