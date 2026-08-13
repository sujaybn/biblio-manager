import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateProgress } from "@/lib/library/api";
import type { Book } from "@/lib/library/types";

/**
 * Lets you update how far you are through a book.
 * The total page count is only asked for when the book doesn't have one yet.
 */
export function ProgressEditor({ book }: { book: Book }) {
  const update = useUpdateProgress();
  const [open, setOpen] = useState(false);
  const [pagesRead, setPagesRead] = useState(String(book.pages_read ?? 0));
  const [pageCount, setPageCount] = useState(book.page_count ? String(book.page_count) : "");

  useEffect(() => {
    setPagesRead(String(book.pages_read ?? 0));
    setPageCount(book.page_count ? String(book.page_count) : "");
  }, [book.id, book.pages_read, book.page_count]);

  const total = book.page_count ?? (pageCount ? Number(pageCount) : null);
  const pct =
    book.page_count && book.page_count > 0
      ? Math.min(100, Math.round((book.pages_read / book.page_count) * 100))
      : null;

  function submit() {
    const read = Math.max(0, Math.round(Number(pagesRead) || 0));
    const count = book.page_count ?? (pageCount ? Math.max(1, Math.round(Number(pageCount))) : null);
    if (count && read > count) {
      toast.error("That's more pages than the book has.");
      return;
    }
    update.mutate(
      { id: book.id, pages_read: read, page_count: book.page_count ? null : count },
      {
        onSuccess: () => {
          toast.success("Progress updated.");
          setOpen(false);
        },
        onError: () => toast.error("Could not save that."),
      },
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {pct !== null ? (
          <div className="min-w-40 flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              {book.pages_read} of {book.page_count} pages · {pct}%
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            {book.pages_read > 0 ? `${book.pages_read} pages read` : "No page count yet"}
          </p>
        )}
        <Button
          variant="ghost"
          className="h-8 rounded-full px-3 text-[12px] text-muted-foreground"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Cancel" : "Update progress"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-[12px] text-muted-foreground">
            Pages read
            <Input
              type="number"
              min={0}
              value={pagesRead}
              onChange={(e) => setPagesRead(e.target.value)}
              className="mt-1 h-9 w-28"
            />
          </label>
          {!book.page_count && (
            <label className="text-[12px] text-muted-foreground">
              Total pages
              <Input
                type="number"
                min={1}
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                className="mt-1 h-9 w-28"
              />
            </label>
          )}
          <Button className="h-9 rounded-full px-5" onClick={submit} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
          {total ? (
            <span className="pb-2 text-[12px] text-muted-foreground">of {total} pages</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
