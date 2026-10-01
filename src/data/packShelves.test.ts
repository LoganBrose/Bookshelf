import { describe, expect, it } from 'vitest';
import type { Book } from '../types';
import { packShelves } from './packShelves';

let n = 0;
const book = (title: string, series = '', seriesNumber?: number): Book => ({
  id: `b${n}`,
  title,
  author: 'A',
  series,
  seriesNumber,
  genres: [],
  order: n++,
});
const titles = (shelves: Book[][]) => shelves.map((s) => s.map((b) => b.title));

describe('packShelves', () => {
  it('fills shelves in order with standalones', () => {
    const books = ['a', 'b', 'c', 'd', 'e'].map((t) => book(t));
    expect(titles(packShelves(books, 2))).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('moves a series that does not fit and backfills the gap', () => {
    const books = [book('a'), book('s1', 'S'), book('s2', 'S'), book('s3', 'S'), book('b'), book('c')];
    expect(titles(packShelves(books, 3))).toEqual([['a', 'b', 'c'], ['s1', 's2', 's3']]);
  });

  it('splits a series longer than a shelf across shelves', () => {
    const books = [book('a'), ...[1, 2, 3, 4, 5].map((i) => book(`s${i}`, 'S', i))];
    expect(titles(packShelves(books, 3))).toEqual([['a'], ['s1', 's2', 's3'], ['s4', 's5']]);
  });

  it('orders a series by series number, keeping it where its first book appears', () => {
    const books = [book('s3', 'S', 3), book('a'), book('s1', 'S', 1), book('s2', 'S', 2)];
    expect(titles(packShelves(books, 4))).toEqual([['s1', 's2', 's3', 'a']]);
  });
});
