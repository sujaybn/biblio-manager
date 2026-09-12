export interface IsbnLookup {
  isbn: string;
  title: string;
  author: string;
  language: string;
  genre: string;
  year: string;
  page_count: string;
  cover_url: string;
  source: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  kn: "Kannada",
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  mr: "Marathi",
  bn: "Bengali",
  sa: "Sanskrit",
  fr: "French",
  de: "German",
  es: "Spanish",
};

/** Keep only digits and a trailing X, then validate length. */
export function normaliseIsbn(raw: string): string | null {
  const cleaned = raw.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (cleaned.length === 10 || cleaned.length === 13) return cleaned;
  return null;
}

/** ISBN-13 → ISBN-10, only possible for the 978-prefixed range. */
function toIsbn10(isbn13: string): string | null {
  if (isbn13.length !== 13 || !isbn13.startsWith("978")) return null;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i]);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}

/** ISBN-10 → ISBN-13 (always possible). */
function toIsbn13(isbn10: string): string {
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * Number(core[i]);
  const check = (10 - (sum % 10)) % 10;
  return core + String(check);
}

/** A book can be printed with different ISBN-10/13 editions, and sources
 * sometimes only index one form. Trying both roughly doubles the chance of
 * a match for the exact same physical book. */
function isbnVariants(isbn: string): string[] {
  const variants = [isbn];
  if (isbn.length === 13) {
    const as10 = toIsbn10(isbn);
    if (as10) variants.push(as10);
  } else if (isbn.length === 10) {
    variants.push(toIsbn13(isbn));
  }
  return variants;
}

function languageName(code?: string) {
  if (!code) return "English";
  return LANGUAGE_NAMES[code.toLowerCase().slice(0, 2)] ?? "English";
}

async function fromGoogleBooks(isbn: string): Promise<IsbnLookup | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    items?: Array<{
      volumeInfo?: {
        title?: string;
        subtitle?: string;
        authors?: string[];
        language?: string;
        categories?: string[];
        publishedDate?: string;
        pageCount?: number;
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
      };
    }>;
  };
  const info = json.items?.[0]?.volumeInfo;
  if (!info?.title) return null;
  const thumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? "";
  return {
    isbn,
    title: info.title,
    author: (info.authors ?? []).join(", "),
    language: languageName(info.language),
    genre: info.categories?.[0] ?? "",
    year: info.publishedDate?.slice(0, 4) ?? "",
    page_count: info.pageCount ? String(info.pageCount) : "",
    cover_url: thumb.replace(/^http:/, "https:"),
    source: "Google Books",
  };
}

async function fromOpenLibrary(isbn: string): Promise<IsbnLookup | null> {
  const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
  if (!res.ok) return null;
  const book = (await res.json()) as {
    title?: string;
    subjects?: string[];
    publish_date?: string;
    number_of_pages?: number;
    languages?: Array<{ key?: string }>;
    authors?: Array<{ key?: string }>;
  };
  if (!book.title) return null;

  let author = "";
  const authorKey = book.authors?.[0]?.key;
  if (authorKey) {
    try {
      const ares = await fetch(`https://openlibrary.org${authorKey}.json`);
      if (ares.ok) {
        const a = (await ares.json()) as { name?: string };
        author = a.name ?? "";
      }
    } catch {
      /* author is optional */
    }
  }

  const langKey = book.languages?.[0]?.key?.split("/").pop() ?? "";
  const langMap: Record<string, string> = { kan: "Kannada", eng: "English", hin: "Hindi" };

  return {
    isbn,
    title: book.title,
    author,
    language: langMap[langKey] ?? "English",
    genre: book.subjects?.[0] ?? "",
    year: book.publish_date?.match(/\d{4}/)?.[0] ?? "",
    page_count: book.number_of_pages ? String(book.number_of_pages) : "",
    cover_url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    source: "Open Library",
  };
}

/** Open Library's search endpoint matches more loosely than its strict
 * per-edition /isbn/{isbn}.json lookup, and occasionally finds regional or
 * small-press editions the strict endpoint doesn't have a direct record
 * for. Worth trying as a distinct third pass, not just a duplicate of
 * fromOpenLibrary. */
async function fromOpenLibrarySearch(isbn: string): Promise<IsbnLookup | null> {
  const res = await fetch(
    `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&fields=title,author_name,language,subject,first_publish_year,number_of_pages_median,cover_i`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    docs?: Array<{
      title?: string;
      author_name?: string[];
      language?: string[];
      subject?: string[];
      first_publish_year?: number;
      number_of_pages_median?: number;
      cover_i?: number;
    }>;
  };
  const doc = json.docs?.[0];
  if (!doc?.title) return null;

  const langMap: Record<string, string> = { kan: "Kannada", eng: "English", hin: "Hindi" };
  return {
    isbn,
    title: doc.title,
    author: (doc.author_name ?? []).join(", "),
    language: langMap[doc.language?.[0] ?? ""] ?? "English",
    genre: doc.subject?.[0] ?? "",
    year: doc.first_publish_year ? String(doc.first_publish_year) : "",
    page_count: doc.number_of_pages_median ? String(doc.number_of_pages_median) : "",
    cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : "",
    source: "Open Library (search)",
  };
}

/** Try Google Books, then Open Library's exact edition lookup, then Open
 * Library's broader search — across every ISBN-10/13 form the scanned code
 * could be indexed under. Small and regional-language presses (including
 * many Kannada publishers) are inconsistently catalogued, so casting this
 * wide net meaningfully improves the hit rate versus just one source/form. */
export async function lookupIsbn(isbn: string): Promise<IsbnLookup | null> {
  const variants = isbnVariants(isbn);
  const sources = [fromGoogleBooks, fromOpenLibrary, fromOpenLibrarySearch];

  for (const source of sources) {
    for (const variant of variants) {
      try {
        const result = await source(variant);
        if (result) return { ...result, isbn };
      } catch {
        // try the next source/variant
      }
    }
  }
  return null;
}

export const normaliseTitle = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();