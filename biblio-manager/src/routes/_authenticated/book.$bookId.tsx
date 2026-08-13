import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BookCard } from "@/components/library/BookCard";
import { BookDialog } from "@/components/library/BookDialog";
import { LoanDialog } from "@/components/library/LoanDialog";
import { ProgressEditor } from "@/components/library/ProgressEditor";
import { Button } from "@/components/ui/button";
import { RichText, isRichTextEmpty } from "@/components/library/RichText";
import { RichTextEditor } from "@/components/library/RichTextEditor";
import {
  useBooks,
  useDeleteBook,
  useLoans,
  useReturnLoan,
  useSaveBook,
  useSetReadingStatus,
} from "@/lib/library/api";
import {
  activeLoan,
  bookGenres,
  formatLoanDate,
  isOverdue,
  READING_LABEL,
  sharesGenre,
  SHELF_LABEL,
  spineStyle,
} from "@/lib/library/types";

export const Route = createFileRoute("/_authenticated/book/$bookId")({
  head: () => ({
    meta: [
      { title: "Book — Shelf & Margin" },
      {
        name: "description",
        content: "A single book in your library, with your notes, review and lending history.",
      },
      { property: "og:title", content: "Book — Shelf & Margin" },
      { property: "og:description", content: "Your notes, review and lending history." },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const { data: books = [], isLoading } = useBooks();
  const { data: loans = [] } = useLoans();
  const save = useSaveBook();
  const del = useDeleteBook();
  const ret = useReturnLoan();
  const setStatus = useSetReadingStatus();
  const [editing, setEditing] = useState(false);
  const [lending, setLending] = useState(false);
  const [writing, setWriting] = useState(false);
  const [notes, setNotes] = useState("");
  const [review, setReview] = useState("");

  const book = books.find((b) => b.id === bookId);

  useEffect(() => {
    if (!book) return;
    setNotes(book.notes ?? "");
    setReview(book.review ?? "");
  }, [book?.id, book?.notes, book?.review]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!book)
    return (
      <div className="paper p-10 text-center">
        <h1 className="font-display text-xl">That book isn't here</h1>
        <Link to="/library" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to the library
        </Link>
      </div>
    );

  const related = books.filter((b) => b.id !== book.id && sharesGenre(b, book)).slice(0, 3);
  const history = loans.filter((l) => l.book_id === book.id);
  const current = activeLoan(loans, book.id);
  const settled = history.filter((l) => l.returned_on);
  const progress =
    book.page_count && book.page_count > 0
      ? Math.min(100, Math.round((book.pages_read / book.page_count) * 100))
      : null;

  async function saveText(n?: string, r?: string) {
    if (!book) return;
    const nextNotes = n ?? notes;
    const nextReview = r ?? review;
    try {
      await save.mutateAsync({
        id: book.id,
        title: book.title,
        notes: isRichTextEmpty(nextNotes) ? null : nextNotes,
        review: isRichTextEmpty(nextReview) ? null : nextReview,
      });
      toast.success("Saved to your margins.");
      setWriting(false);
    } catch {
      toast.error("Could not save that.");
    }
  }

  return (
    <div className="pb-8">
      <Link to="/library" className="text-[13px] text-muted-foreground hover:text-foreground">
        ← Back to library
      </Link>

      <header className="paper mt-4 flex flex-wrap gap-6 p-7">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`Cover of ${book.title}`}
            className="h-44 w-28 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <div
            className="h-44 w-28 shrink-0 rounded-lg rounded-l-sm"
            style={spineStyle(book.cover_hue)}
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl leading-snug">{book.title}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {book.author || "Unknown author"}
            {book.year ? ` · ${book.year}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
            <Pill>{book.language}</Pill>
            {bookGenres(book).map((g) => (
              <Pill key={g}>{g}</Pill>
            ))}
            <Pill>
              {current
                ? current.direction === "lent"
                  ? "Lent out"
                  : "Borrowed in"
                : SHELF_LABEL[book.shelf]}
            </Pill>
            <Pill>{READING_LABEL[book.reading_status]}</Pill>
            {book.rating ? <Pill>{"★".repeat(book.rating)}</Pill> : null}
          </div>
          {book.tags.length > 0 && (
            <p className="mt-3 text-[12px] text-muted-foreground">{book.tags.join(" · ")}</p>
          )}
          {book.reading_status !== "finished" ? (
            <div className="mt-4 max-w-sm">
              <ProgressEditor book={book} />
            </div>
          ) : (
            progress !== null && (
              <div className="mt-4 max-w-sm">
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  {book.pages_read} of {book.page_count} pages
                </p>
              </div>
            )
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            {book.reading_status === "reading" ? (
              <Button
                className="rounded-full px-5"
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate(
                    { id: book.id, reading_status: "finished" },
                    {
                      onSuccess: () => toast.success("Marked as finished."),
                      onError: () => toast.error("Could not update that."),
                    },
                  )
                }
              >
                Mark as finished
              </Button>
            ) : (
              <Button
                className="rounded-full px-5"
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate(
                    { id: book.id, reading_status: "reading" },
                    {
                      onSuccess: () => toast.success("Added to currently reading."),
                      onError: () => toast.error("Could not update that."),
                    },
                  )
                }
              >
                Start reading
              </Button>
            )}
            <Button variant="outline" className="rounded-full" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {current ? (
              <Button
                variant="outline"
                className="rounded-full"
                disabled={ret.isPending}
                onClick={() =>
                  ret.mutate(current, {
                    onSuccess: () => toast.success("Marked as returned."),
                    onError: () => toast.error("Could not update that."),
                  })
                }
              >
                {current.direction === "lent" ? "Got it back" : "Gave it back"}
              </Button>
            ) : (
              <Button variant="outline" className="rounded-full" onClick={() => setLending(true)}>
                Record a loan
              </Button>
            )}
            <Button
              variant="ghost"
              className="rounded-full text-muted-foreground"
              onClick={() => {
                del.mutate(book.id, {
                  onSuccess: () => {
                    toast.success("Removed from your library.");
                    void navigate({ to: "/library" });
                  },
                });
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      </header>

      <section
        className={`paper mt-5 flex flex-wrap items-center justify-between gap-4 p-5 ${
          current && isOverdue(current) ? "border-clay" : ""
        }`}
      >
        <div>
          <h2 className="eyebrow">Where it is</h2>
          {current ? (
            <>
              <p className="mt-2 font-display text-[16px]">
                {current.direction === "lent" ? "Lent to " : "Borrowed from "}
                {current.counterparty}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Since {formatLoanDate(current.started_on)}
                {current.due_on ? ` · due ${formatLoanDate(current.due_on)}` : " · no due date"}
              </p>
              {current.note ? (
                <p className="mt-1 text-[12px] italic text-muted-foreground">{current.note}</p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-[15px]">
              {book.shelf === "wishlist"
                ? "On your wish list — not in the house yet."
                : "On your shelf, with you."}
            </p>
          )}
        </div>
        {current && isOverdue(current) && (
          <span className="rounded-full bg-clay-soft px-3 py-1 text-[12px] text-clay">Overdue</span>
        )}
      </section>



      <section className="paper mt-6 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="eyebrow">My notes &amp; review</h2>
          <div className="flex items-center gap-2">
            <Link to="/notes" className="text-[12px] text-muted-foreground hover:text-foreground">
              All margins
            </Link>
            <Button
              variant="ghost"
              className="h-8 rounded-full px-3 text-[12.5px]"
              onClick={() => {
                setNotes(book.notes ?? "");
                setReview(book.review ?? "");
                setWriting((w) => !w);
              }}
            >
              {writing
                ? "Cancel"
                : !isRichTextEmpty(book.notes) || !isRichTextEmpty(book.review)
                  ? "Edit"
                  : "Write"}
            </Button>
          </div>
        </div>

        {writing ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[13px] text-muted-foreground">My notes</p>
              <div className="mt-2">
                <RichTextEditor
                  value={notes}
                  onChange={setNotes}
                  placeholder="Quotes, margins, thoughts as you go…"
                  minHeight="8rem"
                />
              </div>
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">My review</p>
              <div className="mt-2">
                <RichTextEditor
                  value={review}
                  onChange={setReview}
                  placeholder="What it left behind."
                  minHeight="6rem"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                className="rounded-full text-muted-foreground"
                onClick={() => {
                  setNotes("");
                  setReview("");
                  void saveText("", "");
                }}
              >
                Clear both
              </Button>
              <Button
                className="rounded-full px-6"
                onClick={() => void saveText()}
                disabled={save.isPending}
              >
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : !isRichTextEmpty(book.notes) || !isRichTextEmpty(book.review) ? (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-[13px] text-muted-foreground">Notes</p>
              {!isRichTextEmpty(book.notes) ? (
                <RichText
                  value={book.notes!}
                  className="mt-2 border-l-2 border-border pl-4 text-[14.5px] leading-relaxed"
                />
              ) : (
                <p className="mt-2 text-[13px] text-muted-foreground">Nothing yet.</p>
              )}
            </div>
            <div>
              <p className="text-[13px] text-muted-foreground">Review</p>
              {!isRichTextEmpty(book.review) ? (
                <RichText
                  value={book.review!}
                  className="mt-2 border-l-2 border-primary/40 pl-4 text-[14.5px] leading-relaxed"
                />
              ) : (
                <p className="mt-2 text-[13px] text-muted-foreground">Nothing yet.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing written for this one yet.
          </p>
        )}
      </section>


      {settled.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">Past loans</h2>
          <ul className="mt-3 space-y-2">
            {settled.map((l) => (
              <li
                key={l.id}
                className="paper flex flex-wrap items-baseline justify-between gap-2 p-4 text-[13px]"
              >
                <span className="text-muted-foreground">
                  {l.direction === "lent" ? "Lent to" : "Borrowed from"}{" "}
                  <span className="text-foreground">{l.counterparty}</span>
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {formatLoanDate(l.started_on)} → {formatLoanDate(l.returned_on!)}
                </span>
              </li>
            ))}
          </ul>

        </section>
      )}

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">More {book.genre.toLowerCase()}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}

      <BookDialog open={editing} onOpenChange={setEditing} book={book} />
      <LoanDialog open={lending} onOpenChange={setLending} bookId={book.id} />
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">{children}</span>
  );
}
