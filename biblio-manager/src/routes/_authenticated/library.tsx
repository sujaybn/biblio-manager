import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BookCard } from "@/components/library/BookCard";
import { Bookcase } from "@/components/library/BookCase";
import { BookDialog } from "@/components/library/BookDialog";
import { ScanDialog } from "@/components/library/ScanDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBooks, useBulkUpdateBooks, useGenres, useSeedLibrary } from "@/lib/library/api";
import { searchLibrary } from "@/lib/library/search";
import { BookGridSkeleton } from "@/components/library/Skeletons";
import {
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
  const [language, setLanguage] = useState("all");
  const [genre, setGenre] = useState("all");
  const [shelf, setShelf] = useState("all");
  const [sort, setSort] = useState<SortKey>("alpha");
  const [view, setView] = useState<"grid" | "list" | "shelf">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [prefill, setPrefill] =
    useState<React.ComponentProps<typeof BookDialog>["prefill"]>(null);
  const bulkUpdate = useBulkUpdateBooks();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  // Only show languages you actually have books in — not the full list of
  // languages the "add a book" dropdown supports. Add a book in a new
  // language and it'll appear here on its own.
  const languages = useMemo(
    () => Array.from(new Set(books.map((b) => b.language))).sort(),
    [books],
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
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          >
            {selectMode ? "Cancel" : "Select"}
          </Button>
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

      {selectMode && (
        <div className="paper sticky top-[68px] z-30 mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5">
          <p className="text-[13px] text-muted-foreground">
            {selected.size === 0
              ? "Tap books below to select them."
              : `${selected.size} book${selected.size === 1 ? "" : "s"} selected`}
          </p>
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <BulkShelfPicker
                onPick={(newShelf) => {
                  const ids = Array.from(selected);
                  bulkUpdate.mutate(
                    { ids, patch: { shelf: newShelf } },
                    {
                      onSuccess: () => {
                        toast.success(`Moved ${ids.length} book${ids.length === 1 ? "" : "s"}.`);
                        exitSelectMode();
                      },
                      onError: () => toast.error("Could not update those."),
                    },
                  );
                }}
              />
              {genres.length > 0 && (
                <BulkGenrePicker
                  genres={genres}
                  onPick={(newGenre) => {
                    const ids = Array.from(selected);
                    bulkUpdate.mutate(
                      { ids, patch: { genre: newGenre, genres: [newGenre] } },
                      {
                        onSuccess: () => {
                          toast.success(
                            `Updated genre for ${ids.length} book${ids.length === 1 ? "" : "s"}.`,
                          );
                          exitSelectMode();
                        },
                        onError: () => toast.error("Could not update those."),
                      },
                    );
                  }}
                />
              )}
              <button
                onClick={exitSelectMode}
                className="text-[12.5px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

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
            {(["grid", "list", "shelf"] as const).map((v) => (
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
        <BookGridSkeleton />
      ) : books.length === 0 ? (
        <EmptyLibrary onSeed={() => seed.mutate()} seeding={seed.isPending} />
      ) : (
        <>
          {showing.length > 0 && (
            <Section
              title={query.trim() ? `Matches for "${query.trim()}"` : "On your shelves"}
              books={showing}
              view={view}
              selectMode={selectMode}
              selected={selected}
              onToggleSelect={toggleSelected}
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
  selectMode,
  selected,
  onToggleSelect,
}: {
  title: string;
  books: Book[];
  view: "grid" | "list" | "shelf";
  muted?: boolean;
  selectMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <section className="mt-9">
      <h2 className={`eyebrow ${muted ? "text-muted-foreground" : ""}`}>{title}</h2>
      {view === "shelf" ? (
        <Bookcase books={books} />
      ) : (
        <div
          className={
            view === "grid"
              ? "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "mt-4 flex flex-col gap-3"
          }
        >
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              selectable={selectMode}
              selected={selected?.has(book.id)}
              onToggleSelect={() => onToggleSelect?.(book.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BulkShelfPicker({ onPick }: { onPick: (shelf: Book["shelf"]) => void }) {
  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (!e.target.value) return;
        onPick(e.target.value as Book["shelf"]);
        e.target.value = "";
      }}
      className="h-9 rounded-xl border border-input bg-card px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <option value="" disabled>
        Move to shelf…
      </option>
      {(Object.entries(SHELF_LABEL) as [Book["shelf"], string][]).map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
  );
}

function BulkGenrePicker({
  genres,
  onPick,
}: {
  genres: string[];
  onPick: (genre: string) => void;
}) {
  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (!e.target.value) return;
        onPick(e.target.value);
        e.target.value = "";
      }}
      className="h-9 rounded-xl border border-input bg-card px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <option value="" disabled>
        Set genre…
      </option>
      {genres.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
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