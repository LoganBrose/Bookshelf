import { useEffect, useSyncExternalStore } from 'react';
import type { Book, BookInfo } from '../types';

/**
 * Looks up cover, page count and public rating for a book from
 * Open Library and Google Books, merging the two. Results are cached in
 * localStorage so each book is fetched once.
 */

const CACHE_KEY = 'bookshelf.lookup.v1';
const HIT_TTL = 30 * 24 * 3600 * 1000;
const MISS_TTL = 24 * 3600 * 1000;
const MAX_CONCURRENT = 4;
const PERSIST_DELAY = 500;

type Entry = { info: BookInfo; t: number };

const store = new Map<string, BookInfo>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

let persisted: Record<string, Entry> = {};
try {
  persisted = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
  const now = Date.now();
  for (const [k, e] of Object.entries(persisted)) {
    const ttl = isEmpty(e.info) ? MISS_TTL : HIT_TTL;
    if (now - e.t < ttl) store.set(k, e.info);
    else delete persisted[k];
  }
} catch {
  persisted = {};
}

function isEmpty(i: BookInfo) {
  return !i.coverUrl && !i.pageCount && i.webRating == null;
}

function save(key: string, info: BookInfo) {
  store.set(key, info);
  persisted[key] = { info, t: Date.now() };
  schedulePersist();
  version++;
  listeners.forEach((l) => l());
}

// Results arrive one book at a time; write the whole cache at most every PERSIST_DELAY.
let persistTimer: ReturnType<typeof setTimeout> | undefined;
function schedulePersist() {
  persistTimer ??= setTimeout(persist, PERSIST_DELAY);
}
function persist() {
  clearTimeout(persistTimer);
  persistTimer = undefined;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(persisted));
  } catch {
    /* storage unavailable — in-memory cache still works */
  }
}
addEventListener('pagehide', () => persistTimer && persist());

export const lookupKey = (b: Pick<Book, 'title' | 'author'>) =>
  `${b.title.toLowerCase()}|${b.author.toLowerCase()}`;

// ---- Fetching ----------------------------------------------------------

const queue: (() => Promise<void>)[] = [];
let active = 0;
function enqueue(job: () => Promise<void>) {
  queue.push(job);
  pump();
}
function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const job = queue.shift()!;
    active++;
    job().finally(() => {
      active--;
      pump();
    });
  }
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function fromOpenLibrary(title: string, author: string): Promise<BookInfo> {
  const params = new URLSearchParams({
    title,
    author,
    limit: '5',
    fields: 'cover_i,number_of_pages_median,ratings_average,ratings_count,edition_count',
  });
  const data = await getJson(`https://openlibrary.org/search.json?${params}`);
  const docs: any[] = data.docs ?? [];
  // The most-published match is almost always the right work.
  const doc = docs.sort((a, b) => (b.edition_count ?? 0) - (a.edition_count ?? 0))[0];
  if (!doc) return {};
  return {
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
    pageCount: doc.number_of_pages_median || undefined,
    webRating: doc.ratings_count ? doc.ratings_average : undefined,
    ratingsCount: doc.ratings_count || undefined,
  };
}

async function fromGoogleBooks(title: string, author: string): Promise<BookInfo> {
  const q = `intitle:${title}${author ? `+inauthor:${author}` : ''}`;
  const data = await getJson(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&printType=books`,
  );
  const vols: any[] = (data.items ?? []).map((i: any) => i.volumeInfo ?? {});
  const withPages = vols.find((v) => v.pageCount > 0);
  const withRating = vols.find((v) => v.averageRating != null && v.ratingsCount > 0);
  const withCover = vols.find((v) => v.imageLinks?.thumbnail);
  return {
    coverUrl: withCover?.imageLinks.thumbnail
      .replace(/^http:/, 'https:')
      .replace('&edge=curl', ''),
    pageCount: withPages?.pageCount,
    webRating: withRating?.averageRating,
    ratingsCount: withRating?.ratingsCount,
  };
}

/** Merged info, or undefined when both sources failed (so nothing is cached). */
async function lookup(title: string, author: string): Promise<BookInfo | undefined> {
  const results = await Promise.allSettled([
    fromOpenLibrary(title, author),
    fromGoogleBooks(title, author),
  ]);
  if (results.every((r) => r.status === 'rejected')) return undefined;
  const [ol, gb] = results.map((r) => (r.status === 'fulfilled' ? r.value : {}));
  // Ratings: prefer whichever source has more votes behind it.
  const useOl = (ol.ratingsCount ?? 0) >= (gb.ratingsCount ?? 0);
  const rated = useOl ? ol : gb;
  return {
    coverUrl: ol.coverUrl ?? gb.coverUrl,
    pageCount: gb.pageCount ?? ol.pageCount,
    webRating: rated.webRating,
    ratingsCount: rated.ratingsCount,
    ratingSource: rated.webRating != null ? (useOl ? 'Open Library' : 'Google Books') : undefined,
  };
}

function ensure(book: Book) {
  const key = lookupKey(book);
  if (store.has(key) || inflight.has(key)) return;
  inflight.add(key);
  enqueue(async () => {
    const info = await lookup(book.title, book.author);
    inflight.delete(key);
    // On failure (offline, rate-limited) leave it uncached so the next load retries.
    if (info) save(key, info);
  });
}

// ---- React bindings ----------------------------------------------------

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Info for one book, with values from the sheet taking priority. */
export function getInfo(book: Book): BookInfo & { loaded: boolean } {
  const key = lookupKey(book);
  const info = store.get(key) ?? {};
  return {
    ...info,
    coverUrl: book.coverUrl ?? info.coverUrl,
    pageCount: book.pages ?? info.pageCount,
    loaded: store.has(key),
  };
}

/** Subscribes to lookup results for the given books, fetching any missing. */
export function useBookInfos(books: Book[]): number {
  const v = useSyncExternalStore(subscribe, () => version);
  useEffect(() => {
    books.forEach(ensure);
  }, [books]);
  return v;
}
