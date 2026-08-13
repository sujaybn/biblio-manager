import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { LoanDialog } from "@/components/library/LoanDialog";
import { Button } from "@/components/ui/button";
import { useBooks, useDeleteLoan, useLoans, useReturnLoan } from "@/lib/library/api";
import type { Loan } from "@/lib/library/types";

export const Route = createFileRoute("/_authenticated/lending")({
  head: () => ({
    meta: [
      { title: "Lending — Shelf & Margin" },
      {
        name: "description",
        content:
          "Track which books you lent out, who has them, what you borrowed and when it is due back.",
      },
      { property: "og:title", content: "Lending — Shelf & Margin" },
      { property: "og:description", content: "Who has your books, and whose books you have." },
    ],
  }),
  component: LendingPage,
});

function LendingPage() {
  const { data: loans = [], isLoading } = useLoans();
  const { data: books = [] } = useBooks();
  const [open, setOpen] = useState(false);

  const active = loans.filter((l) => !l.returned_on);
  const lent = active.filter((l) => l.direction === "lent");
  const borrowed = active.filter((l) => l.direction === "borrowed");
  const past = loans.filter((l) => l.returned_on);
  const inHouse = books.filter(
    (b) => b.shelf === "owned" && !lent.some((l) => l.book_id === b.id),
  );

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Comings and goings</p>
          <h1 className="mt-1.5 font-display text-3xl">Lending</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {inHouse.length} in the house · {lent.length} lent out · {borrowed.length} borrowed in
          </p>
        </div>
        <Button className="rounded-full px-5" onClick={() => setOpen(true)}>
          Record a loan
        </Button>
      </header>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-8 space-y-10">
          <LoanGroup
            title="Lent out"
            empty="Nothing is out at the moment."
            loans={lent}
          />
          <LoanGroup
            title="Borrowed in"
            empty="You haven't borrowed anything right now."
            loans={borrowed}
          />
          {past.length > 0 && (
            <LoanGroup title="Returned" empty="" loans={past} settled />
          )}
        </div>
      )}

      <LoanDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function LoanGroup({
  title,
  empty,
  loans,
  settled,
}: {
  title: string;
  empty: string;
  loans: Loan[];
  settled?: boolean;
}) {
  const ret = useReturnLoan();
  const del = useDeleteLoan();

  return (
    <section>
      <h2 className="eyebrow">{title}</h2>
      {loans.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {loans.map((loan) => {
            const overdue =
              !loan.returned_on && loan.due_on && Date.parse(loan.due_on) < Date.now();
            return (
              <li
                key={loan.id}
                className="paper flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <Link
                    to="/book/$bookId"
                    params={{ bookId: loan.book_id }}
                    className="font-display text-[15px] hover:underline"
                  >
                    {loan.books?.title ?? "A book"}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {loan.direction === "lent" ? "With" : "From"}{" "}
                    <span className="text-foreground">{loan.counterparty}</span> · since{" "}
                    {formatDate(loan.started_on)}
                    {loan.due_on ? ` · due ${formatDate(loan.due_on)}` : ""}
                    {loan.returned_on ? ` · returned ${formatDate(loan.returned_on)}` : ""}
                  </p>
                  {loan.note ? (
                    <p className="mt-1 text-[12px] italic text-muted-foreground">{loan.note}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {overdue && (
                    <span className="rounded-full bg-clay-soft px-2.5 py-1 text-[11px] text-clay">
                      Overdue
                    </span>
                  )}
                  {!settled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        ret.mutate(loan, {
                          onSuccess: () => toast.success("Marked as returned."),
                          onError: () => toast.error("Could not update that."),
                        });
                      }}
                    >
                      {loan.direction === "lent" ? "Got it back" : "Gave it back"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground"
                    onClick={() => del.mutate(loan.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
