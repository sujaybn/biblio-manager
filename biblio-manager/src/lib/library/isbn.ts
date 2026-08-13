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

/** Look the ISBN up in Google Books, falling back to Open Library. */
export async function lookupIsbn(isbn: string): Promise<IsbnLookup | null> {
  try {
    const google = await fromGoogleBooks(isbn);
    if (google) return google;
  } catch {
    /* try the next source */
  }
  try {
    return await fromOpenLibrary(isbn);
  } catch {
    return null;
  }
}

export const normaliseTitle = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
