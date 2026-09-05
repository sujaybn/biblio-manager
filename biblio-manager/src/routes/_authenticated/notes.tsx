import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichText, isRichTextEmpty } from "@/components/library/RichText";
import { RichTextEditor } from "@/components/library/RichTextEditor";
import { useBooks, useSaveMargins } from "@/lib/library/api";
import { bookGenres, spineStyle, type Book } from "@/lib/library/types";
import { ListSkeleton } from "@/components/library/Skeletons";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Notes & reviews — Shelf & Margin" },
      {
        name: "description",
        content:
          "Everything you wrote in the margins: your notes and reviews for every book, in one readable place.",
      },
      { property: "og:title", content: "Notes & reviews — Shelf & Margin" },
      { property: "og:description", content: "Your margins, gathered in one place." },
    ],
  }),
  component: NotesPage,
});

type Filter = "all" | "notes" | "reviews";

function NotesPage() {
  const { data: books = [], isLoading } = useBooks();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const hasNotes = (b: Book) => !isRichTextEmpty(b.notes);
  const hasReview = (b: Book) => !isRichTextEmpty(b.review);

  const written = books
    .filter((b) => hasNotes(b) || hasReview(b))
    .filter((b) => (filter === "notes" ? hasNotes(b) : filter === "reviews" ? hasReview(b) : true))
    .filter((b) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return [b.title, b.author, b.notes ?? "", b.review ?? ""]
        .join(" ")
        .replace(/<[^>]*>/g, " ")
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

  const blank = books.filter((b) => isRichTextEmpty(b.notes) && isRichTextEmpty(b.review));

  return (
    <div className="pb-10">
      <p className="eyebrow">The margins</p>
      <h1 className="mt-1.5 font-display text-3xl">Notes &amp; reviews</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Everything you've written, book by book. Edit or clear any of it from here.
      </p>

      <div className="paper mt-7 flex flex-wrap items-center gap-3 p-5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your own words…"
          className="h-11 min-w-56 flex-1 rounded-2xl border-transparent bg-secondary"
        />
        <div className="flex gap-2">
          {(
            [
              ["all", "Everything"],
              ["notes", "Notes"],
              ["reviews", "Reviews"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                filter === val
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : written.length === 0 ? (
        <p className="paper mt-8 p-8 text-sm text-muted-foreground">
          Nothing written yet. Open a book and add a note or a review — it will gather here.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {written.map((book) => (
            <MarginEntry key={book.id} book={book} query={query.trim()} />
          ))}
        </div>
      )}

      {blank.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow text-muted-foreground">Still unwritten</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {blank.map((b) => (
              <Link
                key={b.id}
                to="/book/$bookId"
                params={{ bookId: b.id }}
                className="rounded-full bg-secondary px-3.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
              >
                {b.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MarginEntry({ book, query }: { book: Book; query: string }) {
  const save = useSaveMargins();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(book.notes ?? "");
  const [review, setReview] = useState(book.review ?? "");

  async function commit(next: { notes?: string | null; review?: string | null }) {
    try {
      await save.mutateAsync({ id: book.id, ...next });
      toast.success("Saved to your margins.");
      setEditing(false);
    } catch {
      toast.error("Could not save that.");
    }
  }

  return (
    <article className="paper p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={`Cover of ${book.title}`}
              loading="lazy"
              className="h-14 w-10 shrink-0 rounded-md border border-border object-cover"
            />
          ) : (
            <div
              className="h-14 w-10 shrink-0 rounded-md rounded-l-sm"
              style={spineStyle(book.cover_hue)}
              aria-hidden
            />
          )}
          <div className="min-w-0">
            <Link
              to="/book/$bookId"
              params={{ bookId: book.id }}
              className="font-display text-[17px] hover:underline"
            >
              {book.title}
            </Link>
            <p className="text-[13px] text-muted-foreground">
              {book.author || "Unknown author"} · {book.language}
              {bookGenres(book).length ? ` · ${bookGenres(book).join(" · ")}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {book.rating ? <span className="text-[13px] text-clay">{"★".repeat(book.rating)}</span> : null}
          <Button
            variant="ghost"
            className="h-8 rounded-full px-3 text-[12.5px]"
            onClick={() => {
              setNotes(book.notes ?? "");
              setReview(book.review ?? "");
              setEditing((e) => !e);
            }}
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </header>

      {editing ? (
        <div className="mt-5 space-y-4">
          <div>
            <p className="eyebrow">My notes</p>
            <div className="mt-2">
              <RichTextEditor
                value={notes}
                onChange={setNotes}
                placeholder="Quotes, margins, thoughts as you go…"
                minHeight="7rem"
              />
            </div>
          </div>
          <div>
            <p className="eyebrow">My review</p>
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
              onClick={() => void commit({ notes: null, review: null })}
            >
              Clear both
            </Button>
            <Button
              className="rounded-full px-6"
              disabled={save.isPending}
              onClick={() =>
                void commit({
                  notes: isRichTextEmpty(notes) ? null : notes,
                  review: isRichTextEmpty(review) ? null : review,
                })
              }
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="eyebrow">My notes</p>
            {!isRichTextEmpty(book.notes) ? (
              <RichText
                value={book.notes!}
                className="mt-2 border-l-2 border-border pl-4 text-[14px] leading-relaxed"
              />
            ) : (
              <p className="mt-2 text-[13px] text-muted-foreground">No notes yet.</p>
            )}
          </div>
          <div>
            <p className="eyebrow">My review</p>
            {!isRichTextEmpty(book.review) ? (
              <RichText
                value={book.review!}
                className="mt-2 border-l-2 border-primary/40 pl-4 text-[14px] leading-relaxed"
              />
            ) : (
              <p className="mt-2 text-[13px] text-muted-foreground">No review yet.</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
/** Strips a rich-text field to plain text and shows a short excerpt around
 * the first search match, with the match highlighted — so a hit is easy to
 * spot without reading the whole entry. Falls back to a plain trimmed
 * excerpt if the match came from the title/author instead of this field. */
function Excerpt({ html, query, className }: { html: string; query: string; className?: string }) {
  const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const idx = plain.toLowerCase().indexOf(query.toLowerCase());

  if (idx === -1) {
    return (
      <p className={className}>{plain.length > 180 ? `${plain.slice(0, 180)}…` : plain}</p>
    );
  }

  const radius = 90;
  const start = Math.max(0, idx - radius);
  const end = Math.min(plain.length, idx + query.length + radius);
  return (
    <p className={className}>
      {start > 0 ? "…" : ""}
      {plain.slice(start, idx)}
      <mark className="rounded-sm bg-clay-soft px-0.5 text-foreground">
        {plain.slice(idx, idx + query.length)}
      </mark>
      {plain.slice(idx + query.length, end)}
      {end < plain.length ? "…" : ""}
    </p>
  );
}