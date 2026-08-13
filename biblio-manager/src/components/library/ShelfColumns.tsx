import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBooks, useToggleUpNext } from "@/lib/library/api";
import { isUpNext, spineStyle, type Book } from "@/lib/library/types";

function Row({ book, trailing }: { book: Book; trailing?: React.ReactNode }) {
  const pct =
    book.page_count && book.page_count > 0
      ? Math.min(100, Math.round((book.pages_read / book.page_count) * 100))
      : null;
  return (
    <li className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary">
      <Link to="/book/$bookId" params={{ bookId: book.id }} className="flex min-w-0 flex-1 gap-3">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`Cover of ${book.title}`}
            loading="lazy"
            className="h-16 w-11 shrink-0 rounded-md border border-border object-cover"
          />
        ) : (
          <div
            className="h-16 w-11 shrink-0 rounded-md rounded-l-sm"
            style={spineStyle(book.cover_hue)}
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[14px] leading-snug">{book.title}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {book.author || "Unknown author"}
          </p>
          {pct !== null && (
            <>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{pct}% through</p>
            </>
          )}
        </div>
      </Link>
      {trailing}
    </li>
  );
}

export function ShelfColumns() {
  const { data: books = [], isLoading } = useBooks();
  const toggle = useToggleUpNext();
  const [picking, setPicking] = useState(false);

  const openNow = books.filter((b) => b.reading_status === "reading");
  const reading = openNow.filter((b) => b.shelf !== "kindle");
  const onKindle = openNow.filter((b) => b.shelf === "kindle");
  const upNext = books.filter((b) => isUpNext(b) && b.reading_status !== "finished");
  const candidates = books.filter(
    (b) => !isUpNext(b) && b.reading_status !== "finished" && b.shelf !== "borrowed",
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Opening your shelves…</p>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="paper p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="eyebrow">Currently reading</h2>
          <Link to="/reading" className="text-[12px] text-muted-foreground hover:text-foreground">
            All progress
          </Link>
        </div>
        {openNow.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing open right now. Mark a book as “Reading” and it lands here.
          </p>
        ) : (
          <>
            {reading.length > 0 && (
              <ul className="mt-3 space-y-1">
                {reading.map((b) => (
                  <Row key={b.id} book={b} />
                ))}
              </ul>
            )}
            {onKindle.length > 0 && (
              <div className={reading.length > 0 ? "mt-5 border-t border-border pt-4" : "mt-3"}>
                <p className="eyebrow text-muted-foreground">And on Kindle</p>
                <ul className="mt-2 space-y-1">
                  {onKindle.map((b) => (
                    <Row key={b.id} book={b} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <section className="paper p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="eyebrow">Next to read</h2>
          <button
            className="text-[12px] text-muted-foreground hover:text-foreground"
            onClick={() => setPicking((p) => !p)}
          >
            {picking ? "Close" : "Add a book"}
          </button>
        </div>

        {picking && (
          <div className="mt-3 flex gap-2">
            <select
              className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              defaultValue=""
              onChange={(e) => {
                const book = candidates.find((b) => b.id === e.target.value);
                if (!book) return;
                toggle.mutate(book, {
                  onSuccess: () => {
                    toast.success(`“${book.title}” is up next.`);
                    setPicking(false);
                  },
                  onError: () => toast.error("Could not add that one."),
                });
              }}
            >
              <option value="" disabled>
                Pick a book…
              </option>
              {candidates.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {upNext.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Line up the books you mean to start next, so the pile has an order.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {upNext.map((b) => (
              <Row
                key={b.id}
                book={b}
                trailing={
                  <Button
                    variant="ghost"
                    className="h-8 rounded-full px-3 text-[12px] text-muted-foreground"
                    onClick={() => toggle.mutate(b)}
                  >
                    Remove
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
