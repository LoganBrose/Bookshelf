import type { Book } from '../types';
import { getInfo } from '../data/bookLookup';
import { Cover } from './Cover';
import { WebRating } from './CoverPopover';

/** Featured card(s) for the book(s) marked in the TBR tab's Reading column. */
export function CurrentlyReading({ books }: { books: Book[] }) {
  return (
    <section className="now-reading" aria-label="Currently reading">
      {books.map((book) => {
        const info = getInfo(book);
        return (
          <article key={book.id} className="now-card">
            <Cover book={book} url={info.coverUrl} className="now-cover" />
            <div className="now-body">
              <p className="now-label">Currently reading</p>
              <h2>{book.title}</h2>
              <p className="now-author">{book.author}</p>
              <p className="now-meta">
                {[book.series, book.genres.join(', '), info.pageCount && `${info.pageCount.toLocaleString()} pages`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <WebRating book={book} size={16} />
            </div>
          </article>
        );
      })}
    </section>
  );
}
