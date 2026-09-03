import { Link } from "@tanstack/react-router";

import { useLoans } from "@/lib/library/api";

/** Surfaces overdue and soon-due loans right on the home page, so a reminder
 * doesn't require remembering to check the Lending page. Renders nothing if
 * there's nothing urgent. */
export function LoanReminders() {
  const { data: loans = [] } = useLoans();

  const active = loans.filter((l) => !l.returned_on && l.due_on);
  const now = Date.now();
  const urgent = active
    .map((l) => ({ loan: l, dueMs: Date.parse(l.due_on!) }))
    .filter(({ dueMs }) => dueMs - now < 3 * 24 * 60 * 60 * 1000)
    .sort((a, b) => a.dueMs - b.dueMs)
    .slice(0, 3);

  if (urgent.length === 0) return null;

  return (
    <div className="paper mb-6 flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-clay p-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {urgent.map(({ loan, dueMs }) => {
          const overdue = dueMs < now;
          return (
            <Link
              key={loan.id}
              to="/book/$bookId"
              params={{ bookId: loan.book_id }}
              className="text-[13px]"
            >
              <span className={overdue ? "text-clay" : "text-foreground"}>
                {overdue ? "Overdue: " : "Due soon: "}
              </span>
              <span className="hover:underline">{loan.books?.title ?? "A book"}</span>
              <span className="text-muted-foreground"> · {loan.counterparty}</span>
            </Link>
          );
        })}
      </div>
      <Link to="/lending" className="shrink-0 text-[12.5px] text-muted-foreground hover:text-foreground">
        See all in Lending →
      </Link>
    </div>
  );
}