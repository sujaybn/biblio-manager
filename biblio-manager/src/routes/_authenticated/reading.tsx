import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { BookCard } from "@/components/library/BookCard";
import { BookDialog } from "@/components/library/BookDialog";
import { ProgressEditor } from "@/components/library/ProgressEditor";
import { Button } from "@/components/ui/button";
import { useBooks, useSetReadingStatus } from "@/lib/library/api";
import type { Book } from "@/lib/library/types";

export const Route = createFileRoute("/_authenticated/reading")({
  head: () => ({
    meta: [
      { title: "Currently reading — Shelf & Margin" },
      {
        name: "description",
        content: "The books you have open right now, with progress and your latest notes.",
      },
      { property: "og:title", content: "Currently reading — Shelf & Margin" },
      { property: "og:description", content: "The books you have open right now." },
    ],
  }),
  component: ReadingPage,
});

function ReadingPage() {
  const { data: books = [], isLoading } = useBooks();
  const setStatus = useSetReadingStatus();
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);

  const openNow = books.filter((b) => b.reading_status === "reading");
  const reading = openNow.filter((b) => b.shelf !== "kindle");
  const onKindle = openNow.filter((b) => b.shelf === "kindle");
  const candidates = books.filter((b) => b.reading_status !== "reading");
  const finished = books
    .filter((b) => b.reading_status === "finished")
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 6);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">In hand</p>
          <h1 className="mt-1.5 font-display text-3xl">Currently reading</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setPicking((p) => !p)}
          >
            {picking ? "Close" : "Pick from my library"}
          </Button>
          <Button className="rounded-full px-5" onClick={() => setAdding(true)}>
            Add a book I'm reading
          </Button>
        </div>
      </div>

      {picking && (
        <div className="paper mt-4 p-4">
          <p className="text-[13px] text-muted-foreground">
            Mark a book already in your library as currently reading.
          </p>
          <select
            className="mt-2 h-10 w-full max-w-md rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            defaultValue=""
            onChange={(e) => {
              const book = candidates.find((b) => b.id === e.target.value);
              if (!book) return;
              setStatus.mutate(
                { id: book.id, reading_status: "reading" },
                {
                  onSuccess: () => {
                    toast.success(`“${book.title}” is open now.`);
                    setPicking(false);
                  },
                  onError: () => toast.error("Could not update that one."),
                },
              );
            }}
          >
            <option value="" disabled>
              Pick a book…
            </option>
            {candidates.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
                {b.author ? ` — ${b.author}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Finding your bookmarks…</p>
      ) : openNow.length === 0 ? (
        <p className="paper mt-8 p-8 text-sm text-muted-foreground">
          Nothing open at the moment. Add a book you're reading, or pick one from your library.
        </p>
      ) : (
        <>
          {reading.length > 0 && <ProgressList books={reading} />}
          {onKindle.length > 0 && (
            <section className="mt-10">
              <h2 className="eyebrow">And on Kindle</h2>
              <ProgressList books={onKindle} />
            </section>
          )}
        </>
      )}

      {finished.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow text-muted-foreground">Recently finished</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {finished.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      <BookDialog
        open={adding}
        onOpenChange={setAdding}
        prefill={{ reading_status: "reading" }}
      />
    </div>
  );
}

function ProgressList({ books }: { books: Book[] }) {
  return (
    <div className="mt-6 space-y-4">
      {books.map((book) => (
        <div key={book.id} className="space-y-2">
          <BookCard book={book} />          
          <div className="px-1">
            <ProgressEditor book={book} />
          </div>
        </div>
      ))}
    </div>
  );
}



