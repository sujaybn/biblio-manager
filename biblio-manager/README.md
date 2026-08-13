# Shelf & Margin

A private, personal library web app for a multilingual reader — primarily Kannada and English literature, with room for Hindi, Bengali, Marathi, Tamil, Telugu, Malayalam, Sanskrit, Urdu, French, Russian, German, Spanish and Japanese.

It keeps four things in one place: **what you own**, **what you're reading**, **what you want**, and **where your books physically are** (lent out, borrowed in, on the shelf, or on Kindle) — plus the margins: your private notes and reviews.

---

## Feature overview

**Catalogue**
- Books with title, author, language, multiple genres, shelf, reading status, rating, year, page count, cover image and free-form tags.
- Shelves: *On my shelf*, *On Kindle*, *Wish list*, *Borrowed in*.
- Cover images: upload your own (private storage + long-lived signed URLs) or pull the cover from an ISBN lookup; books without a cover fall back to a generated warm spine colour.
- Add a book manually, by scanning an ISBN barcode with the camera, or by typing an ISBN. Metadata is fetched from Google Books with an Open Library fallback, pre-filled into an editable form, and duplicate titles are rejected before insert.

**Genres**
- Genres are per-language and fully CRUD-managed. Renaming a genre re-points every book that used it.
- A book can carry several genres at once.

**Reading**
- Currently reading and *Next to read* columns on the home screen, with Kindle titles grouped under "And on Kindle".
- Start reading / mark finished / set aside from the card, the library list or the book page.
- Page-progress tracking: record pages read and set the total page count inline when it isn't known yet.

**Lending**
- Record a loan in either direction (lent out / borrowed in) with counterparty, due date and note.
- One active loan per book is enforced; overdue loans are flagged.
- Returning a borrowed book removes the temporary record; returning a lent book restores it to the shelf.

**Margins (notes & reviews)**
- A rich-text editor (bold, italic, strikethrough, headings, quotes, bullet and numbered lists, alignment, highlight, font family and size).
- A dedicated **Margins** page lists every note and review across the library, searchable and editable in place.
- Stored as HTML and sanitised with DOMPurify on render.

**Search that never dead-ends**
- Fuzzy, diacritic- and script-tolerant matching over title, author, genre, tags and notes.
- A query with no exact hit never shows an empty state: it falls back to books sharing the closest genre or language, and surfaces matching wish-list items so "I don't own it yet" is an answer rather than a blank page.

**Design**
- "Ink & Parchment": parchment `#F6F1E7`, ink `#211B17`, burgundy `#6B2737`, brass `#8A6D3B`. Lora for headings, Nunito Sans for body.
- Flat and quiet: hairline borders, no gradients, minimal shadow. All colour is expressed as semantic tokens in `src/styles.css`, so the palette is one file away from a full re-theme.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR + server functions) |
| Build | Vite 7, deployed to an edge Worker runtime |
| Routing | TanStack Router, file-based under `src/routes` |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS v4 (`src/styles.css`, `@theme` tokens) + shadcn/ui on Radix primitives |
| Editor | Tiptap 3 + DOMPurify |
| Barcode | `@zxing/browser` (camera ISBN scanning) |
| Backend | Lovable Cloud — Postgres, Auth, Storage, row-level security |
| Auth | Email/password + Google OAuth |

External data: Google Books API and Open Library (unauthenticated, called from the client at add-book time only).

---

## System design

```text
                 browser (React 19 / TanStack Router)
                 │
                 │  TanStack Query hooks  → src/lib/library/api.ts
                 ▼
     ┌───────────────────────────┐        ┌────────────────────────┐
     │  Postgres (RLS per user)  │        │  Storage: book-covers  │
     │  books / genres / loans   │        │  private + signed URLs │
     └───────────────────────────┘        └────────────────────────┘
                 ▲
                 │  Auth (email+password, Google) → auth.users.id = user_id
```

**Route tree**

```text
src/routes
├── __root.tsx                  app shell, nav, head metadata
├── index.tsx                   landing / dashboard (reading + next-to-read)
├── auth.tsx                    sign in / sign up
└── _authenticated/
    ├── route.tsx               auth gate (redirects to /auth)
    ├── library.tsx             catalogue: search, filters, sort, list/grid
    ├── reading.tsx             currently reading + progress
    ├── wishlist.tsx            wish list
    ├── lending.tsx             loans in and out
    ├── notes.tsx               margins: all notes & reviews
    └── book.$bookId.tsx        single book: detail, status, margins, related
```

**Data model** (all tables carry `user_id` and are locked to the owner by RLS)

- `books` — `title, author, language, genre, genres[], shelf, reading_status, rating, review, notes, cover_url, tags[], year, page_count, pages_read, cover_hue, created_at, updated_at`
- `genres` — `name, language` (unique per user + language)
- `loans` — `book_id, direction ('lent' | 'borrowed'), counterparty, started_on, due_on, returned_on, note`

**Access model.** Every table has row-level security with explicit grants; a user can only ever read or write rows where `user_id = auth.uid()`. Cover images live in a **private** bucket keyed by `userId/uuid.ext` and are served through signed URLs — nothing about a library is publicly reachable.

**Derivation over duplication.** Shelf badges, overdue flags, loan summaries, up-next membership and related-book suggestions are all derived at render time from the three tables by pure helpers in `src/lib/library/types.ts` and `src/lib/library/search.ts`. There is no denormalised state to drift.

**Key modules**

- `src/lib/library/api.ts` — every read and mutation as a Query/Mutation hook, with a single shared invalidation.
- `src/lib/library/types.ts` — domain types plus pure helpers (`sortBooks`, `bookGenres`, `activeLoan`, `isOverdue`, `spineStyle`).
- `src/lib/library/search.ts` — scoring and the no-empty-result fallback chain.
- `src/lib/library/isbn.ts` — ISBN normalisation and metadata lookup with provider fallback.

---

## Development

```sh
npm i
npm run dev
```

The backend is provisioned by Lovable Cloud; `VITE_SUPABASE_*` values are injected into `.env` automatically. Schema changes live in `supabase/migrations`.
