import { createFileRoute, Link } from "@tanstack/react-router";

import { ShelfColumns } from "@/components/library/ShelfColumns";
import { useSession } from "@/lib/library/api";
import { LoanReminders } from "@/components/library/LoanReminders";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shelf & Margin — Your personal library, kept warmly" },
      {
        name: "description",
        content:
          "Catalogue your Kannada and English books, track what you're reading, who borrowed what, your wish list, notes and reviews — in one calm place.",
      },
      { property: "og:title", content: "Shelf & Margin — Your personal library, kept warmly" },
      {
        property: "og:description",
        content:
          "Catalogue your Kannada and English books, track what you're reading, who borrowed what, your wish list, notes and reviews — in one calm place.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    title: "A catalogue in two tongues",
    body: "Kannada and English shelves stand side by side, each with genres you name yourself — Kadambari next to literary fiction, ಕವನ next to poetry.",
  },
  {
    title: "Search that never comes back empty",
    body: "Half-remember a title, spell it three ways, search in the wrong language — you still land somewhere useful: the same genre, the same shelf, or the book waiting on your wish list.",
  },
  {
    title: "Lent, borrowed, accounted for",
    body: "Who walked off with your Samskara in March, and whose Parva is quietly living on your desk. Dates, names, due-by reminders — so no book disappears politely.",
  },
  {
    title: "Margins of your own",
    body: "Notes, quotes, half-formed arguments and star ratings live with the book, and turn up in search exactly the way titles do.",
  },
  {
    title: "Covers, or a spine you choose",
    body: "Upload the jacket of your copy — the worn one, the reprint, the one with your name inside — or let a plain coloured spine stand in for it.",
  },
  {
    title: "Reading, in progress",
    body: "Page counts, where you left off, and the four books you're honestly halfway through instead of the one you claim to be reading.",
  },
];

function Landing() {
  const { userId, loading } = useSession();

  if (userId && !loading) {
    return (
      <div className="pb-12 pt-8">
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-1.5 font-display text-3xl">On your desk</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          What's open, and what's waiting its turn.
        </p>
       <div className="mt-7">
        <LoanReminders />
        <ShelfColumns />
      </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/library"
            className="rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground"
          >
            Browse the library
          </Link>
          <Link
            to="/notes"
            className="rounded-full border border-clay/50 px-6 py-2.5 text-sm text-clay"
          >
            Notes &amp; reviews
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <section className="mx-auto max-w-3xl pt-10 text-center sm:pt-20">

        <p className="eyebrow">A personal library · Kannada &amp; English</p>
        <h1 className="mt-4 font-display text-4xl leading-[1.12] sm:text-6xl">
          Every book you own,
          <br />
          <span className="italic text-primary">and every one you lent away.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Most of us keep a library in three places at once — a shelf, a memory, and a friend's
          house. Shelf &amp; Margin gathers all three into one calm catalogue: what you own, what
          you're reading, what you're still hunting for, who has your copy, and everything you
          scribbled in the margins along the way.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="rounded-full bg-primary px-7 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open my library
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-full border border-clay/50 px-7 py-3 text-sm text-clay transition-colors hover:bg-secondary"
          >
            Create an account
          </Link>
        </div>
        <p className="mt-5 text-[12.5px] text-muted-foreground">
          Free, private to you, and it starts with a shelf of Kannada and English classics if you
          want one.
        </p>
      </section>

      <section className="mx-auto mt-20 max-w-5xl">
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <article key={f.title} className="paper p-7">
              <h2 className="font-display text-lg">{f.title}</h2>
              <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-2xl text-center">
        <div className="flex justify-center gap-2" aria-hidden>
          {[24, 34, 44, 54, 64, 74].map((hue) => (
            <div
              key={hue}
              className="h-24 w-7 rounded-md"
              style={{ backgroundColor: `oklch(0.6 0.055 ${hue})` }}
            />
          ))}
        </div>
        <p className="mt-7 font-display text-xl italic text-ink-soft">
          "A library is a room where the past keeps talking."
        </p>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Yours should remember the conversation too.
        </p>
      </section>
    </div>
  );
}
