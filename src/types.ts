export interface Book {
  id: string;
  title: string;
  author: string;
  /** Display name of the series (typo-tolerant clustered), or '' for standalones. */
  series: string;
  seriesNumber?: number;
  genres: string[];
  /** Your rating out of 10 (Books Read only). */
  rating?: number;
  dateRead?: string;
  /** Page count from the sheet, if a Pages column exists. */
  pages?: number;
  /** Cover URL from the sheet, if a Cover column exists. */
  coverUrl?: string;
  /** Original sheet row order. */
  order: number;
}

export interface BookInfo {
  coverUrl?: string;
  pageCount?: number;
  /** Public average rating out of 5. */
  webRating?: number;
  ratingsCount?: number;
  ratingSource?: string;
}
