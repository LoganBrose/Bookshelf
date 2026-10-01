import { describe, expect, it } from 'vitest';
import type { Book } from '../types';
import { normalizeBooks, parseBooks, parseRating } from './sheet';

let n = 0;
const book = (b: Partial<Book>): Book => ({
  id: `b${n}`,
  title: 'T',
  author: '',
  series: '',
  genres: [],
  order: n++,
  ...b,
});

describe('parseRating', () => {
  it.each([
    ['8.4', 8.4],
    ['4/5', 8],
    ['★★★★', 8],
    ['★★★½', 7],
    ['8,5', 8.5],
    ['', undefined],
    ['n/a', undefined],
  ])('%s → %s', (raw, expected) => {
    expect(parseRating(raw)).toBe(expected);
  });
});

describe('parseBooks', () => {
  it('matches header aliases regardless of case and spacing', () => {
    const csv = ' Book Title ,AUTHORS,Series  Name,Series #,Genres,My Rating\nDune,Frank Herbert,Dune,1,Sci-Fi; Classic / Epic,9\n';
    expect(parseBooks(csv, 'r')).toEqual([
      expect.objectContaining({
        id: 'r-0',
        title: 'Dune',
        author: 'Frank Herbert',
        series: 'Dune',
        seriesNumber: 1,
        genres: ['Sci-Fi', 'Classic', 'Epic'],
        rating: 9,
      }),
    ]);
  });

  it('drops rows without a title', () => {
    const csv = 'Title,Author\nA,X\n,Y\nB,Z\n';
    expect(parseBooks(csv, 'r').map((b) => b.title)).toEqual(['A', 'B']);
  });
});

describe('normalizeBooks', () => {
  it('merges small series typos into the most common spelling', () => {
    const read = [
      book({ series: 'The Stormlight Archives' }),
      book({ series: 'The Stormlight Archives' }),
    ];
    const tbr = [book({ series: 'the stormlight archieves' })];
    normalizeBooks(read, tbr);
    expect([...read, ...tbr].map((b) => b.series)).toEqual(Array(3).fill('The Stormlight Archives'));
  });

  it('merges author typos but keeps different surnames apart', () => {
    const books = [
      book({ author: 'Brandon Sanderson' }),
      book({ author: 'Brandon Sandersen' }),
      book({ author: 'John Green' }),
      book({ author: 'John Grey' }),
      book({ author: 'Jane Smith' }),
      book({ author: 'Jane Smyth' }),
    ];
    normalizeBooks(books, []);
    expect(books.map((b) => b.author)).toEqual([
      'Brandon Sanderson',
      'Brandon Sanderson',
      'John Green',
      'John Grey',
      'Jane Smith',
      'Jane Smyth',
    ]);
  });

  it('does not merge short, different series names', () => {
    const books = [book({ series: 'Dune' }), book({ series: 'Dunk' })];
    normalizeBooks(books, []);
    expect(books.map((b) => b.series)).toEqual(['Dune', 'Dunk']);
  });

  it('canonicalizes genre case to the first spelling seen', () => {
    const books = [book({ genres: ['Fantasy'] }), book({ genres: ['fantasy', 'Horror'] })];
    normalizeBooks(books, []);
    expect(books.map((b) => b.genres)).toEqual([['Fantasy'], ['Fantasy', 'Horror']]);
  });
});
