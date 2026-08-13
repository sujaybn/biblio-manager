import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { useLoans, useSetReadingStatus } from "@/lib/library/api";
import {
  activeLoan,
  bookGenres,
  formatLoanDate,
  isOverdue,
  spineStyle,
  type Book,
} from "@/lib/library/types";

const statusTone: Record<string, string> = {
  reading: "bg-clay-soft text-clay",
  finished: "bg-accent text-accent-foreground",
  unread: "bg-muted text-muted-foreground",
  abandoned: "bg-muted text-muted-foreground",
};

export function BookCard({ book, note }: { book: Book; note?: string }) {
  const { data: loans = [] } = useLoans();
  const setStatus = useSetReadingStatus();
  const loan = activeLoan(loans, book.id);
  const canStart = book.reading_status === "unread" || book.reading_status === "abandoned";
  return (
    <Link
      to="/book/$bookId"
      params={{ bookId: book.id }}
      className="paper group flex gap-4 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt={`Cover of ${book.title}`}
          loading="lazy"
          className="h-24 w-16 shrink-0 rounded-md border border-border object-cover"
        />
      ) : (
        <div
          className="h-24 w-16 shrink-0 rounded-md rounded-l-sm"
          style={spineStyle(book.cover_hue)}
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[15px] leading-snug">{book.title}</h3>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {book.author || "Unknown author"}
        </p>
        <p className="mt-2 text-[12px] text-ink-soft">
          {book.language}
          {bookGenres(book).length > 0 ? ` · ${bookGenres(book).join(" · ")}` : ""}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone[book.reading_status] ?? statusTone["unread"]}`}
          >
            {book.reading_status === "reading"
              ? "Reading"
              : book.reading_status === "finished"
                ? "Finished"
                : book.reading_status === "abandoned"
                  ? "Set aside"
                  : "Not started"}
          </span>
          {book.shelf === "wishlist" && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              Wish list
            </span>
          )}
          {book.shelf === "kindle" && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              On Kindle
            </span>
          )}
          {loan ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                isOverdue(loan) ? "bg-clay-soft text-clay" : "border border-border text-muted-foreground"
              }`}
            >
              {loan.direction === "lent" ? "Lent out" : "Borrowed in"}
            </span>
          ) : book.shelf === "borrowed" ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              Borrowed in
            </span>
          ) : book.shelf === "owned" ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              On my shelf
            </span>
          ) : null}
          {book.rating ? (
            <span className="text-[11px] text-clay">{"\u2605".repeat(book.rating)}</span>
          ) : null}
        </div>
        {loan ? (
          <p className="mt-2 text-[12px] text-muted-foreground">
            {loan.direction === "lent" ? "With" : "From"}{" "}
            <span className="text-foreground">{loan.counterparty}</span>
            {loan.due_on ? ` · due ${formatLoanDate(loan.due_on)}` : ""}
            {isOverdue(loan) ? " · overdue" : ""}
          </p>
        ) : null}
        {note ? <p className="mt-2 text-[12px] italic text-muted-foreground">{note}</p> : null}
        {canStart && (
          <button
            type="button"
            className="mt-2.5 rounded-full border border-border px-3 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setStatus.mutate(
                { id: book.id, reading_status: "reading" },
                {
                  onSuccess: () => toast.success(`“${book.title}” is now in Currently reading.`),
                  onError: () => toast.error("Could not update that one."),
                },
              );
            }}
          >
            Start reading
          </button>
        )}
      </div>
    </Link>
  );
}

export function BookGrid({ books, empty }: { books: Book[]; empty?: string }) {
  if (books.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
        {empty ?? "Nothing here yet."}
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}
