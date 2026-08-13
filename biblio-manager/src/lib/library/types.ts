export type Shelf = "owned" | "wishlist" | "borrowed" | "kindle";
export type ReadingStatus = "unread" | "reading" | "finished" | "abandoned";

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  language: string;
  genre: string;
  genres: string[];
  shelf: Shelf;
  reading_status: ReadingStatus;
  rating: number | null;
  review: string | null;
  notes: string | null;
  cover_url: string | null;

  tags: string[];
  year: number | null;
  page_count: number | null;
  pages_read: number;
  cover_hue: number;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  user_id: string;
  name: string;
  language: string;
  created_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  book_id: string;
  direction: "lent" | "borrowed";
  counterparty: string;
  started_on: string;
  due_on: string | null;
  returned_on: string | null;
  note: string | null;
  created_at: string;
  books?: { title: string; author: string; language: string } | null;
}

export const LANGUAGES = [
  "Kannada",
  "English",
  "Hindi",
  "Bengali",
  "Marathi",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Sanskrit",
  "Urdu",
  "French",
  "Russian",
  "German",
  "Spanish",
  "Japanese",
] as const;

/** A book marked "next to read" simply carries this tag. */
export const UP_NEXT_TAG = "up-next";

export function isUpNext(book: Book) {
  return book.tags.includes(UP_NEXT_TAG);
}

export const SORTS = {
  alpha: "Title A–Z",
  alphaDesc: "Title Z–A",
  author: "Author A–Z",
  added: "Last added",
  updated: "Recently updated",
  rating: "Highest rated",
  year: "Newest published",
} as const;

export type SortKey = keyof typeof SORTS;

export function sortBooks(books: Book[], key: SortKey): Book[] {
  const list = [...books];
  const byTitle = (a: Book, b: Book) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  switch (key) {
    case "alpha":
      return list.sort(byTitle);
    case "alphaDesc":
      return list.sort((a, b) => byTitle(b, a));
    case "author":
      return list.sort(
        (a, b) => a.author.localeCompare(b.author, undefined, { sensitivity: "base" }) || byTitle(a, b),
      );
    case "added":
      return list.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    case "updated":
      return list.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    case "rating":
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byTitle(a, b));
    case "year":
      return list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || byTitle(a, b));
    default:
      return list;
  }
}

export const SHELF_LABEL: Record<Shelf, string> = {
  owned: "On my shelf",
  kindle: "On Kindle",
  wishlist: "Wish list",
  borrowed: "Borrowed in",
};

/** Every genre a book carries, with the legacy single genre as a fallback. */
export function bookGenres(book: Book): string[] {
  const list = (book.genres ?? []).map((g) => g.trim()).filter(Boolean);
  if (list.length > 0) return list;
  return book.genre ? [book.genre] : [];
}

export function sharesGenre(a: Book, b: Book) {
  const set = new Set(bookGenres(a).map((g) => g.toLowerCase()));
  return bookGenres(b).some((g) => set.has(g.toLowerCase()));
}

export const READING_LABEL: Record<ReadingStatus, string> = {
  unread: "Not started",
  reading: "Reading",
  finished: "Finished",
  abandoned: "Set aside",
};

export function spineStyle(hue: number) {
  const warm = 20 + (((hue % 360) + 360) % 360) / 6; // keep everything in the ink/brass/burgundy range
  return {
    backgroundColor: `oklch(0.62 0.055 ${warm})`,
  };
}

export function activeLoan(loans: Loan[], bookId: string): Loan | null {
  return loans.find((l) => l.book_id === bookId && !l.returned_on) ?? null;
}

export function loanSummary(loan: Loan) {
  return loan.direction === "lent"
    ? `Lent to ${loan.counterparty}`
    : `Borrowed from ${loan.counterparty}`;
}

export function isOverdue(loan: Loan) {
  return Boolean(!loan.returned_on && loan.due_on && Date.parse(loan.due_on) < Date.now());
}

export function formatLoanDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
