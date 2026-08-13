import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { BookCard } from "@/components/library/BookCard";
import { BookDialog } from "@/components/library/BookDialog";
import { ScanDialog } from "@/components/library/ScanDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBooks, useGenres, useSeedLibrary } from "@/lib/library/api";
import { searchLibrary } from "@/lib/library/search";
import {
  LANGUAGES,
  SHELF_LABEL,
  SORTS,
  bookGenres,
  sortBooks,
  type Book,
  type SortKey,
} from "@/lib/library/types";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "My library — Shelf & Margin" },
      {
        name: "description",
        content:
          "Browse and search your whole catalogue of Kannada, English and other language books by genre, shelf and language.",
      },
      { property: "og:title", content: "My library — Shelf & Margin" },
      { property: "og:description", content: "Your whole catalogue, searchable and calm." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data: books = [], isLoading } = useBooks();
  const { data: genreRows = [] } = useGenres();
  const seed = useSeedLibrary();
  const [query, setQuery] = useState("");
  // Kannada is the shelf you reach for first.
  const [language, setLanguage] = useState("Kannada");
  const [genre, setGenre] = useState("all");
  const [shelf, setShelf] = useState("all");
  const [sort, setSort] = useState<SortKey>("alpha");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [prefill, setPrefill] =
    useState<React.ComponentProps<typeof BookDialog>["prefill"]>(null);

  const languages = useMemo(
    () =>
      Array.from(
        new Set([
          ...books.map((b) => b.language),
          ...genreRows.map((g) => g.language),
          ...LANGUAGES,
        ]),
      ).sort(),
    [books, genreRows],
  );

  const filtered = useMemo(
    () =>
      books.filter(
        (b) =>
          (language === "all" || b.language === language) &&
          (genre === "all" || bookGenres(b).includes(genre)) &&
          (shelf === "all" || b.shelf === shelf),
      ),
    [books, language, genre, shelf],
  );

  const result = useMemo(() => searchLibrary(filtered, query), [filtered, query]);
  const genres = useMemo(
    () =>
      Array.from(
        new Set([
          ...books
            .filter((b) => language === "all" || b.language === language)
            .flatMap(bookGenres),
          ...genreRows
            .filter((g) => language === "all" || g.language === language)
            .map((g) => g.name),
        ]),
      )
        .filter(Boolean)
        .sort(),
    [books, genreRows, language],
  );

  const showing = sortBooks(query.trim() ? result.matches : filtered, sort);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-1.5 font-display text-3xl">My library</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {books.length} {books.length === 1 ? "book" : "books"} across{" "}
            {new Set(books.map((b) => b.language)).size || 0} languages
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-full px-5"
            onClick={() => setScanOpen(true)}
          >
            Scan or enter ISBN
          </Button>
          <Button
            className="rounded-full px-5"
            onClick={() => {
              setPrefill(null);
              setDialogOpen(true);
            }}
          >
            Add a book
          </Button>
        </div>
      </header>

      <div className="paper mt-7 p-5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a title, author, genre, tag or something you wrote in your notes…"
          className="h-12 rounded-2xl border-transparent bg-secondary text-[15px]"
        />

        <FilterRow label="Language">
          <Chips
            value={language}
            onChange={(v) => {
              setLanguage(v);
              setGenre("all");
            }}
            options={[
              ["all", "All languages"],
              ...languages.map((l) => [l, l] as const),
            ]}
          />
        </FilterRow>

        <FilterRow label="Shelf">
          <Chips
            value={shelf}
            onChange={setShelf}
            options={[
              ["all", "All shelves"],
              ...(Object.entries(SHELF_LABEL) as [string, string][]),
            ]}
          />
        </FilterRow>

        {genres.length > 0 && (
          <FilterRow label="Genre">
            <Chips
              value={genre}
              onChange={setGenre}
              options={[["all", "All genres"], ...genres.map((g) => [g, g] as const)]}
            />
          </FilterRow>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
            Sort by
            <select
              className="h-9 rounded-xl border border-input bg-card px-3 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              {(Object.entries(SORTS) as [SortKey, string][]).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] capitalize transition-colors ${
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Opening your shelves…</p>
      ) : books.length === 0 ? (
        <EmptyLibrary onSeed={() => seed.mutate()} seeding={seed.isPending} />
      ) : (
        <>
          {showing.length > 0 && (
            <Section
              title={query.trim() ? `Matches for "${query.trim()}"` : "On your shelves"}
              books={showing}
              view={view}
            />
          )}
          {result.wishlistMatches.length > 0 && query.trim() && (
            <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-[13px] text-muted-foreground">
              {result.wishlistMatches.length === 1
                ? "One of these isn't on your shelf yet — it's on your wish list."
                : `${result.wishlistMatches.length} of these aren't on your shelf yet — they're on your wish list.`}
            </p>
          )}
          {result.suggestions.length > 0 && (
            <Section
              title={result.suggestionReason || "You might also reach for"}
              books={sortBooks(result.suggestions, sort)}
              view={view}
              muted
            />
          )}
          {showing.length === 0 && result.suggestions.length === 0 && (
            <p className="mt-10 text-sm text-muted-foreground">
              Nothing here with these filters. Try widening them.
            </p>
          )}
        </>
      )}

      <BookDialog open={dialogOpen} onOpenChange={setDialogOpen} prefill={prefill} />
      <ScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onFound={(details) => {
          setPrefill({
            title: details.title,
            author: details.author,
            language: details.language,
            genre: details.genre,
            year: details.year,
            page_count: details.page_count,
            cover_url: details.cover_url,
            tags: details.isbn ? `isbn:${details.isbn}` : "",
          });
          setDialogOpen(true);
        }}
      />
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="w-16 shrink-0 text-[11.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <>
      {options.map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
            value === val
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </>
  );
}

function Section({
  title,
  books,
  view,
  muted,
}: {
  title: string;
  books: Book[];
  view: "grid" | "list";
  muted?: boolean;
}) {
  return (
    <section className="mt-9">
      <h2 className={`eyebrow ${muted ? "text-muted-foreground" : ""}`}>{title}</h2>
      <div
        className={
          view === "grid"
            ? "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "mt-4 flex flex-col gap-3"
        }
      >
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}

function EmptyLibrary({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return (
    <div className="paper mt-10 p-10 text-center">
      <h2 className="font-display text-xl">Your shelves are empty</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Add your first book, or start from a small shelf of Kannada and English classics you can
        edit or remove later.
      </p>
      <Button className="mt-6 rounded-full px-6" onClick={onSeed} disabled={seeding}>
        {seeding ? "Filling the shelves…" : "Start with sample books"}
      </Button>
    </div>
  );
}
