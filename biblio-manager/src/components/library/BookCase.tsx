import { Link } from "@tanstack/react-router";

import { bookGenres, spineStyle, type Book } from "@/lib/library/types";

/**
 * A real bookcase: books stand on wooden shelves, grouped into a "case" per
 * language and a shelf per genre within it. Spine color reuses the same
 * spineStyle() used everywhere else a book has no cover — the bookcase is
 * just that identity system made physical, not a separate visual language.
 */
export function Bookcase({ books }: { books: Book[] }) {
  const cases = groupByLanguageThenGenre(books);

  if (cases.length === 0) {
    return (
      <p className="mt-10 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
        Nothing here yet.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      {cases.map(({ language, shelves }) => (
        <div key={language}>
          <p className="eyebrow">{language}</p>
          <div className="mt-3 space-y-7">
            {shelves.map(({ genre, books: shelfBooks }) => (
              <Shelf key={genre} genre={genre} books={shelfBooks} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Shelf({ genre, books }: { genre: string; books: Book[] }) {
  return (
    <div>
      <p className="font-display text-[13px] italic text-ink-soft">{genre}</p>
      <div className="relative mt-2">
        <div
          className="overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,black_94%,transparent)] [scrollbar-width:thin]"
        >
          <div className="flex items-end gap-[3px] px-1 pt-4">
            {books.map((book) => (
              <Spine key={book.id} book={book} />
            ))}
          </div>
        </div>
        {/* the shelf plank itself */}
        <div
          className="relative mt-0 h-3 shrink-0 rounded-[2px]"
          style={{
            background: "linear-gradient(180deg, var(--clay) 0%, #5c481f 100%)",
            boxShadow: "0 5px 8px -3px rgba(0,0,0,0.28)",
          }}
        />
      </div>
    </div>
  );
}

function Spine({ book }: { book: Book }) {
  const h = hash(book.id);
  const height = 176 - (h % 5) * 11; // 176 → 132, organic shelf silhouette
  const width = Math.max(24, Math.min(52, 20 + Math.round((book.page_count ?? 220) / 12)));
  const isWishlist = book.shelf === "wishlist";
  const isReading = book.reading_status === "reading";

  return (
    <Link
      to="/book/$bookId"
      params={{ bookId: book.id }}
      className="group relative shrink-0 rounded-[3px] outline-none transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:shadow-lift focus-visible:-translate-y-1.5 focus-visible:ring-2 focus-visible:ring-ring/60"
      style={{
        width,
        height,
        ...(isWishlist
          ? {
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--border), var(--border) 4px, transparent 4px, transparent 9px)",
              opacity: 0.7,
            }
          : spineStyle(book.cover_hue)),
      }}
      title={`${book.title}${book.author ? ` — ${book.author}` : ""}`}
    >
      {isReading && (
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 h-4 w-2 -translate-x-1/2 bg-primary"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 65%, 50% 100%, 0 65%)" }}
        />
      )}

      {/* gilt bands, top and bottom */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 top-2.5 h-[1.5px] bg-[color:oklch(0.85_0.09_85/0.5)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 bottom-2.5 h-[1.5px] bg-[color:oklch(0.85_0.09_85/0.5)]"
      />

      <span
        className="absolute inset-0 flex items-center justify-center overflow-hidden px-0.5 py-4 text-center font-display text-[10.5px] leading-tight text-background/90"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {book.title}
      </span>

      {book.rating ? (
        <span
          aria-hidden
          className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-[1px]"
        >
          {Array.from({ length: book.rating }).map((_, i) => (
            <span
              key={i}
              className="h-[3px] w-[3px] rounded-full bg-[color:oklch(0.85_0.09_85/0.7)]"
            />
          ))}
        </span>
      ) : null}
    </Link>
  );
}

function groupByLanguageThenGenre(books: Book[]) {
  const byLanguage = new Map<string, Book[]>();
  for (const b of books) {
    const list = byLanguage.get(b.language) ?? [];
    list.push(b);
    byLanguage.set(b.language, list);
  }
  return Array.from(byLanguage.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([language, group]) => ({
      language,
      shelves: groupByGenre(group),
    }));
}

function groupByGenre(books: Book[]) {
  const byGenre = new Map<string, Book[]>();
  for (const b of books) {
    const genres = bookGenres(b);
    const key = genres[0] || "Unsorted";
    const list = byGenre.get(key) ?? [];
    list.push(b);
    byGenre.set(key, list);
  }
  return Array.from(byGenre.entries())
    .sort(([a], [b]) => (a === "Unsorted" ? 1 : b === "Unsorted" ? -1 : a.localeCompare(b)))
    .map(([genre, shelfBooks]) => ({
      genre,
      books: shelfBooks.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })),
    }));
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}