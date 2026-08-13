import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { BookCard } from "@/components/library/BookCard";
import { BookDialog } from "@/components/library/BookDialog";
import { Button } from "@/components/ui/button";
import { useBooks } from "@/lib/library/api";

export const Route = createFileRoute("/_authenticated/wishlist")({
  head: () => ({
    meta: [
      { title: "Wish list — Shelf & Margin" },
      {
        name: "description",
        content: "Books you want next — they show up in search even before they reach your shelf.",
      },
      { property: "og:title", content: "Wish list — Shelf & Margin" },
      { property: "og:description", content: "Books you want next." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { data: books = [], isLoading } = useBooks();
  const [open, setOpen] = useState(false);
  const wishlist = books.filter((b) => b.shelf === "wishlist");

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Not yours yet</p>
          <h1 className="mt-1.5 font-display text-3xl">Wish list</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            These appear in search too, marked clearly as not on your shelf.
          </p>
        </div>
        <Button className="rounded-full px-5" onClick={() => setOpen(true)}>
          Add a wish
        </Button>
      </header>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : wishlist.length === 0 ? (
        <p className="paper mt-8 p-8 text-sm text-muted-foreground">
          Nothing on the wish list. Add the next book you're hunting for.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      <BookDialog open={open} onOpenChange={setOpen} defaultShelf="wishlist" />
    </div>
  );
}
