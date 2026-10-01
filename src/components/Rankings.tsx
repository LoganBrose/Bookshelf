import type { Book } from '../types';
import { getInfo } from '../data/bookLookup';
import { Cover } from './Cover';
import { Stars, formatRating } from './Stars';

export function Rankings({ books }: { books: Book[] }) {
  const ranked = books
    .filter((b) => b.rating != null)
    .sort((a, b) => b.rating! - a.rating! || a.order - b.order);
  const unrated = books.filter((b) => b.rating == null);

  // Standard competition ranking: ties share a rank (1, 2, 2, 4).
  let rank = 0;
  const rows = ranked.map((b, i) => {
    if (i === 0 || b.rating !== ranked[i - 1].rating) rank = i + 1;
    return { book: b, rank };
  });

  return (
    <div className="rankings">
      <ol className="rank-list">
        {rows.map(({ book, rank }) => (
          <li key={book.id} className={`rank-row${rank <= 3 ? ` podium-${rank}` : ''}`}>
            <span className="rank-num">{rank}</span>
            <Cover book={book} url={getInfo(book).coverUrl} className="rank-cover" />
            <div className="rank-text">
              <h3>{book.title}</h3>
              <p>
                {book.author}
                {book.series && <span className="muted"> · {book.series}</span>}
              </p>
            </div>
            <div className="rank-score">
              <strong>{formatRating(book.rating!)}</strong>
              <Stars value={book.rating!} max={10} size={14} />
            </div>
          </li>
        ))}
      </ol>
      {unrated.length > 0 && (
        <p className="muted unrated-note">
          Not yet rated: {unrated.map((b) => b.title).join(', ')}
        </p>
      )}
    </div>
  );
}
