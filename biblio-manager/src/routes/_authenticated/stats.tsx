import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useBooks } from "@/lib/library/api";
import { bookGenres, type Book } from "@/lib/library/types";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Reading stats — Shelf & Margin" },
      { name: "description", content: "A year-in-review of what you actually read." },
    ],
  }),
  component: StatsPage,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function StatsPage() {
  const { data: books = [], isLoading } = useBooks();

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const b of books) {
      if (b.finished_at) set.add(new Date(b.finished_at).getFullYear());
    }
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [books]);

  const [year, setYear] = useState(() => new Date().getFullYear());

  const finishedThisYear = useMemo(
    () =>
      books.filter((b) => b.finished_at && new Date(b.finished_at).getFullYear() === year),
    [books, year],
  );

  const totalPages = finishedThisYear.reduce(
    (sum, b) => sum + (b.page_count ?? b.pages_read ?? 0),
    0,
  );
  const rated = finishedThisYear.filter((b) => b.rating);
  const avgRating = rated.length
    ? (rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length).toFixed(1)
    : null;
  const longest = finishedThisYear.reduce<Book | null>(
    (max, b) => ((b.page_count ?? 0) > (max?.page_count ?? 0) ? b : max),
    null,
  );

  const byLanguage = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of finishedThisYear) m.set(b.language, (m.get(b.language) ?? 0) + 1);
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [finishedThisYear]);

  const byGenre = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of finishedThisYear) {
      for (const g of bookGenres(b).slice(0, 1)) m.set(g, (m.get(g) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [finishedThisYear]);

  const allTimeFinished = books.filter((b) => b.reading_status === "finished").length;

  return (
    <div className="pb-12">
      <p className="eyebrow">Year in review</p>
      <h1 className="mt-1.5 font-display text-3xl">Reading stats</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {allTimeFinished} book{allTimeFinished === 1 ? "" : "s"} finished, all told.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
              y === year
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Adding it up…</p>
      ) : finishedThisYear.length === 0 ? (
        <p className="paper mt-8 p-8 text-sm text-muted-foreground">
          Nothing marked finished in {year} yet. Mark a book finished from its page and it'll
          show up here.
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Books finished" value={String(finishedThisYear.length)} />
            <Stat label="Pages read" value={totalPages.toLocaleString()} />
            <Stat label="Average rating" value={avgRating ? `${avgRating} ★` : "—"} />
            <Stat label="Longest book" value={longest ? `${longest.page_count ?? "?"} pg` : "—"} />
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="paper p-6">
              <h2 className="eyebrow">By language</h2>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byLanguage}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {byLanguage.map((entry, i) => (
                        <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 13,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {byLanguage.map((entry, i) => (
                  <span key={entry.name} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {entry.name} ({entry.value})
                  </span>
                ))}
              </div>
            </div>

            <div className="paper p-6">
              <h2 className="eyebrow">By genre</h2>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byGenre} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="eyebrow">Finished in {year}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {finishedThisYear
                .sort((a, b) => Date.parse(b.finished_at!) - Date.parse(a.finished_at!))
                .map((b) => (
                  <span
                    key={b.id}
                    className="rounded-full bg-secondary px-3.5 py-1.5 text-[13px] text-foreground"
                  >
                    {b.title}
                    {b.rating ? <span className="text-clay"> · {"★".repeat(b.rating)}</span> : null}
                  </span>
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper p-5">
      <p className="text-[12px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-2xl">{value}</p>
    </div>
  );
}