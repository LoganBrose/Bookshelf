import { useState } from 'react';
import type { Book } from '../types';

/** Cover image, or a generated cover when none is found. */
export function Cover({ book, url, className }: { book: Book; url?: string; className?: string }) {
  const [failed, setFailed] = useState<string>();
  if (url && failed !== url) {
    return (
      <img
        className={`cover ${className ?? ''}`}
        src={url}
        alt={`Cover of ${book.title}`}
        loading="lazy"
        onError={() => setFailed(url)}
      />
    );
  }
  return (
    <div className={`cover cover-placeholder ${className ?? ''}`} aria-label={`${book.title} (no cover found)`}>
      <span className="ph-title">{book.title}</span>
      <span className="ph-author">{book.author}</span>
    </div>
  );
}
