import { bookGenres, sharesGenre, type Book } from "./types";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Loose subsequence match — "mlgl" still finds "Malegalalli". */
function isSubsequence(needle: string, haystack: string) {
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return needle.length > 0 && i === needle.length;
}

export function scoreBook(book: Book, query: string): number {
  const q = norm(query);
  if (!q) return 0;
  const title = norm(book.title);
  const author = norm(book.author);
  const genre = norm(bookGenres(book).join(" "));
  const language = norm(book.language);
  const tags = book.tags.map(norm).join(" ");
  const notes = norm(`${book.notes ?? ""} ${book.review ?? ""}`);

  let score = 0;
  if (title === q) score = 120;
  else if (title.startsWith(q)) score = 100;
  else if (title.includes(q)) score = 80;
  else if (author.startsWith(q)) score = 70;
  else if (author.includes(q)) score = 60;
  else if (genre.includes(q)) score = 45;
  else if (language.includes(q)) score = 40;
  else if (tags.includes(q)) score = 35;
  else if (notes.includes(q)) score = 25;
  else if (q.length >= 3 && isSubsequence(q, title)) score = 20;
  else if (q.length >= 3 && isSubsequence(q, author)) score = 15;

  if (score > 0 && book.shelf === "wishlist") score -= 2;
  return score;
}

export interface SearchOutcome {
  query: string;
  /** Books actually matching the query, best first. */
  matches: Book[];
  /** Never empty when the library has books: related reading when matches are thin. */
  suggestions: Book[];
  /** Plain-language explanation of why the suggestions are shown. */
  suggestionReason: string;
  /** Matches that live on the wish list rather than the shelf. */
  wishlistMatches: Book[];
}

/**
 * Search that never dead-ends. If nothing matches directly we fall back to
 * the nearest genre/language, then to highly-rated and recently added books.
 */
export function searchLibrary(books: Book[], query: string): SearchOutcome {
  const q = query.trim();
  const scored = books
    .map((book) => ({ book, score: scoreBook(book, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title));

  const matches = scored.map((row) => row.book);
  const matchIds = new Set(matches.map((b) => b.id));
  const wishlistMatches = matches.filter((b) => b.shelf === "wishlist");

  let suggestions: Book[] = [];
  let suggestionReason = "";

  if (!q) {
    return { query: q, matches, suggestions, suggestionReason, wishlistMatches };
  }

  if (matches.length > 0) {
    const seed = matches[0]!;
    suggestions = books
      .filter((b) => !matchIds.has(b.id) && sharesGenre(b, seed))
      .slice(0, 6);
    if (suggestions.length > 0) {
      suggestionReason = `More ${(bookGenres(seed)[0] ?? "").toLowerCase()} from your library`;
    } else {
      suggestions = books
        .filter((b) => !matchIds.has(b.id) && b.language === seed.language)
        .slice(0, 6);
      if (suggestions.length > 0) {
        suggestionReason = `More ${seed.language} from your library`;
      }
    }
    return { query: q, matches, suggestions, suggestionReason, wishlistMatches };
  }

  // No direct hit — find the closest genre or language the query hints at.
  const nq = norm(q);
  let hitGenre = "";
  for (const b of books) {
    const found = bookGenres(b).find((raw) => {
      const g = norm(raw);
      return g.includes(nq) || nq.includes(g) || isSubsequence(nq, g);
    });
    if (found) {
      hitGenre = found;
      break;
    }
  }
  const languageHit = books.find((b) => {
    const l = norm(b.language);
    return l.includes(nq) || nq.includes(l) || isSubsequence(nq, l);
  });

  if (hitGenre) {
    suggestions = books
      .filter((b) => bookGenres(b).some((g) => g.toLowerCase() === hitGenre.toLowerCase()))
      .slice(0, 8);
    suggestionReason = `Nothing by that name — here is your ${hitGenre.toLowerCase()} shelf`;
  } else if (languageHit) {
    suggestions = books.filter((b) => b.language === languageHit.language).slice(0, 8);
    suggestionReason = `Nothing by that name — here is your ${languageHit.language} shelf`;
  } else {
    const rated = [...books]
      .sort(
        (a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) ||
          Date.parse(b.created_at) - Date.parse(a.created_at),
      )
      .slice(0, 8);
    suggestions = rated;
    suggestionReason = "Nothing matched — books you loved and books you just added";
  }

  return { query: q, matches, suggestions, suggestionReason, wishlistMatches };
}
