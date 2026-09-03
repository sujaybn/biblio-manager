import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useBooks, useGenres, useLoans } from "@/lib/library/api";
import type { Book } from "@/lib/library/types";

export const Route = createFileRoute("/_authenticated/backup")({
  head: () => ({
    meta: [
      { title: "Backup — Shelf & Margin" },
      { name: "description", content: "Download your whole library as a file you keep yourself." },
    ],
  }),
  component: BackupPage,
});

const CSV_COLUMNS: Array<keyof Book> = [
  "title",
  "author",
  "language",
  "genre",
  "shelf",
  "reading_status",
  "rating",
  "year",
  "page_count",
  "pages_read",
  "finished_at",
];

function BackupPage() {
  const { data: books = [] } = useBooks();
  const { data: genres = [] } = useGenres();
  const { data: loans = [] } = useLoans();

  function downloadJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      source: "Shelf & Margin",
      books,
      genres,
      loans,
    };
    download(
      `shelf-and-margin-backup-${dateStamp()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
  }

  function downloadCsv() {
    const header = CSV_COLUMNS.join(",");
    const rows = books.map((b) =>
      CSV_COLUMNS.map((col) => csvCell(String(b[col] ?? ""))).join(","),
    );
    download(`shelf-and-margin-books-${dateStamp()}.csv`, [header, ...rows].join("\n"), "text/csv");
  }

  return (
    <div className="pb-12">
      <p className="eyebrow">Keep a copy</p>
      <h1 className="mt-1.5 font-display text-3xl">Backup &amp; export</h1>
      <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
        Everything here lives in your own Supabase project, but it never hurts to keep a copy
        somewhere else too. Both downloads happen entirely in your browser — nothing is sent
        anywhere.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="paper p-6">
          <h2 className="font-display text-lg">Full backup</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Every book, genre and loan record, as JSON — including notes, reviews, and ratings.
            The complete, restorable copy.
          </p>
          <p className="mt-3 text-[12px] text-muted-foreground">
            {books.length} books · {genres.length} genres · {loans.length} loan records
          </p>
          <Button className="mt-4 rounded-full px-5" onClick={downloadJson}>
            Download JSON
          </Button>
        </div>

        <div className="paper p-6">
          <h2 className="font-display text-lg">Spreadsheet</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Just the books, as a plain CSV — title, author, shelf, status, rating and progress.
            Opens straight in Excel, Sheets, or Numbers.
          </p>
          <p className="mt-3 text-[12px] text-muted-foreground">{books.length} books</p>
          <Button variant="outline" className="mt-4 rounded-full px-5" onClick={downloadCsv}>
            Download CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}