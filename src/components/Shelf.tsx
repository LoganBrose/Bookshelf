import type { Book } from '../types';
import { Spine } from './Spine';

interface Props {
  label: string;
  sublabel?: string;
  books: Book[];
  badge: (b: Book) => string | undefined;
  activeId?: string;
  onActivate: (book: Book, el: HTMLElement) => void;
  onToggle: (book: Book, el: HTMLElement) => void;
  onDeactivate: () => void;
}

export function Shelf({ label, sublabel, books, badge, activeId, onActivate, onToggle, onDeactivate }: Props) {
  return (
    <section className="shelf">
      <header className="shelf-plaque">
        <h2>{label}</h2>
        {sublabel && <span>{sublabel}</span>}
      </header>
      <div className="shelf-row">
        {books.map((b) => (
          <Spine
            key={b.id}
            book={b}
            badge={badge(b)}
            active={activeId === b.id}
            onActivate={onActivate}
            onToggle={onToggle}
            onDeactivate={onDeactivate}
          />
        ))}
      </div>
    </section>
  );
}
