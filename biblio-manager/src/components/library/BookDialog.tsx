import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/library/RichTextEditor";
import { isRichTextEmpty } from "@/components/library/RichText";
import { useBooks, useGenres, useSaveBook, useUploadCover } from "@/lib/library/api";
import { LANGUAGES, bookGenres, type Book } from "@/lib/library/types";

const field =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

type FormShape = ReturnType<typeof blank>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book | null;
  defaultShelf?: Book["shelf"];
  /** Pre-filled values (e.g. from an ISBN scan) — fully editable before saving. */
  prefill?: Partial<FormShape> | null;
}

export function BookDialog({
  open,
  onOpenChange,
  book,
  defaultShelf = "owned",
  prefill,
}: Props) {
  const { data: genres = [] } = useGenres();
  const { data: allBooks = [] } = useBooks();
  const save = useSaveBook();
  const upload = useUploadCover();

  const [form, setForm] = useState(() => blank(defaultShelf));
  const [genreDraft, setGenreDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setGenreDraft("");
    if (book) {
      setForm(fromBook(book));
      return;
    }
    const next = { ...blank(defaultShelf), ...(prefill ?? {}) };
    if (next.genres.length === 0 && next.genre.trim()) next.genres = [next.genre.trim()];
    setForm(next);
  }, [open, book, defaultShelf, prefill]);


  const genreOptions = Array.from(
    new Set([
      ...genres.filter((g) => g.language === form.language).map((g) => g.name),
      ...allBooks.filter((b) => b.language === form.language).flatMap(bookGenres),
    ]),
  )
    .filter((g) => g && !form.genres.includes(g))
    .sort();

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addGenre = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setForm((prev) =>
      prev.genres.some((g) => g.toLowerCase() === value.toLowerCase())
        ? prev
        : { ...prev, genres: [...prev.genres, value] },
    );
    setGenreDraft("");
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("A title is needed.");
      return;
    }
    try {
      await save.mutateAsync({
        ...(book ? { id: book.id } : {}),
        title: form.title.trim(),
        author: form.author.trim(),
        language: form.language,
        genre: (form.genres[0] ?? form.genre).trim() || "Uncategorised",
        genres: form.genres.length > 0 ? form.genres : [],
        shelf: form.shelf,
        reading_status: form.reading_status,
        rating: form.rating ? Number(form.rating) : null,
        year: form.year ? Number(form.year) : null,
        page_count: form.page_count ? Number(form.page_count) : null,
        pages_read: form.pages_read ? Number(form.pages_read) : 0,
        notes: isRichTextEmpty(form.notes) ? null : form.notes,
        review: isRichTextEmpty(form.review) ? null : form.review,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        cover_hue: form.cover_hue,
        cover_url: form.cover_url || null,
      });
      toast.success(book ? "Book updated." : "Added to your library.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the book.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {book ? "Edit book" : "Add a book"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                className="mt-1.5 rounded-xl"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Malegalalli Madumagalu"
              />
            </div>
            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                className="mt-1.5 rounded-xl"
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="Kuvempu"
              />
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <select
                id="language"
                className={`mt-1.5 ${field}`}
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
              >
                {Array.from(new Set([...LANGUAGES, form.language])).map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="genre">Genres</Label>
              {form.genres.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.genres.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[12.5px] text-foreground"
                    >
                      {g}
                      <button
                        type="button"
                        aria-label={`Remove ${g}`}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          set(
                            "genres",
                            form.genres.filter((x) => x !== g),
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Input
                  id="genre"
                  list="genre-options"
                  className="rounded-xl"
                  value={genreDraft}
                  onChange={(e) => setGenreDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addGenre(genreDraft);
                    }
                  }}
                  placeholder="Novel, Poetry, Essays…"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl px-4"
                  onClick={() => addGenre(genreDraft)}
                >
                  Add
                </Button>
              </div>
              <datalist id="genre-options">
                {genreOptions.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                A book can sit under as many genres as it deserves.
              </p>
            </div>
            <div>
              <Label htmlFor="shelf">Shelf</Label>
              <select
                id="shelf"
                className={`mt-1.5 ${field}`}
                value={form.shelf}
                onChange={(e) => set("shelf", e.target.value as Book["shelf"])}
              >
                <option value="owned">On my shelf</option>
                <option value="kindle">On Kindle</option>
                <option value="wishlist">Wish list</option>
                <option value="borrowed">Borrowed from someone</option>
              </select>
            </div>
            <div>
              <Label htmlFor="reading">Reading status</Label>
              <select
                id="reading"
                className={`mt-1.5 ${field}`}
                value={form.reading_status}
                onChange={(e) =>
                  set("reading_status", e.target.value as Book["reading_status"])
                }
              >
                <option value="unread">Not started</option>
                <option value="reading">Currently reading</option>
                <option value="finished">Finished</option>
                <option value="abandoned">Set aside</option>
              </select>
            </div>
            <div>
              <Label htmlFor="rating">Rating (1–5)</Label>
              <Input
                id="rating"
                type="number"
                min={1}
                max={5}
                className="mt-1.5 rounded-xl"
                value={form.rating}
                onChange={(e) => set("rating", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  className="mt-1.5 rounded-xl"
                  value={form.year}
                  onChange={(e) => set("year", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pages">Pages</Label>
                <Input
                  id="pages"
                  type="number"
                  className="mt-1.5 rounded-xl"
                  value={form.page_count}
                  onChange={(e) => set("page_count", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="read">Pages read</Label>
                <Input
                  id="read"
                  type="number"
                  className="mt-1.5 rounded-xl"
                  value={form.pages_read}
                  onChange={(e) => set("pages_read", e.target.value)}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                className="mt-1.5 rounded-xl"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="malenadu, epic, re-read"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>My notes</Label>
              <div className="mt-1.5">
                <RichTextEditor
                  value={form.notes}
                  onChange={(html) => set("notes", html)}
                  placeholder="Margin notes, quotes, where you left off…"
                  minHeight="6rem"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>My review</Label>
              <div className="mt-1.5">
                <RichTextEditor
                  value={form.review}
                  onChange={(html) => set("review", html)}
                  placeholder="What it left behind."
                  minHeight="5rem"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label>Cover image</Label>
              <div className="mt-2 flex items-center gap-4">
                <div
                  className="h-28 w-20 shrink-0 overflow-hidden rounded-md border border-border"
                  style={form.cover_url ? undefined : { backgroundColor: "var(--secondary)" }}
                >
                  {form.cover_url ? (
                    <img
                      src={form.cover_url}
                      alt="Book cover preview"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-[13px] text-muted-foreground file:mr-3 file:rounded-full file:border file:border-clay/50 file:bg-transparent file:px-4 file:py-1.5 file:text-[13px] file:text-clay"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        const url = await upload.mutateAsync(file);
                        set("cover_url", url);
                        toast.success("Cover uploaded.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Could not upload that image.",
                        );
                      }
                    }}
                  />
                  {upload.isPending ? (
                    <p className="text-[12px] text-muted-foreground">Uploading…</p>
                  ) : form.cover_url ? (
                    <button
                      type="button"
                      className="text-[12px] text-muted-foreground underline underline-offset-2"
                      onClick={() => set("cover_url", "")}
                    >
                      Remove cover
                    </button>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">
                      JPG or PNG, up to 5 MB. Without one, a plain spine is used.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Spine colour</Label>
              <input
                type="range"
                min={0}
                max={360}
                value={form.cover_hue}
                onChange={(e) => set("cover_hue", Number(e.target.value))}
                className="mt-3 w-full accent-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full px-6" disabled={save.isPending}>
              {save.isPending ? "Saving…" : book ? "Save changes" : "Add to library"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function blank(shelf: Book["shelf"]) {
  return {
    title: "",
    author: "",
    language: "Kannada" as string,
    genre: "",
    genres: [] as string[],
    shelf,
    reading_status: "unread" as Book["reading_status"],
    rating: "",
    year: "",
    page_count: "",
    pages_read: "",
    notes: "",
    review: "",
    tags: "",
    cover_hue: Math.floor(Math.random() * 360),
    cover_url: "",
  };
}

function fromBook(book: Book) {
  return {
    title: book.title,
    author: book.author,
    language: book.language,
    genre: book.genre,
    genres: bookGenres(book),
    shelf: book.shelf,
    reading_status: book.reading_status,
    rating: book.rating ? String(book.rating) : "",
    year: book.year ? String(book.year) : "",
    page_count: book.page_count ? String(book.page_count) : "",
    pages_read: book.pages_read ? String(book.pages_read) : "",
    notes: book.notes ?? "",
    review: book.review ?? "",
    tags: book.tags.join(", "),
    cover_hue: book.cover_hue,
    cover_url: book.cover_url ?? "",
  };
}
