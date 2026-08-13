import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBooks, useLoans, useSaveLoan } from "@/lib/library/api";
import { activeLoan, loanSummary } from "@/lib/library/types";

const field =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId?: string;
  direction?: "lent" | "borrowed";
}

export function LoanDialog({ open, onOpenChange, bookId, direction = "lent" }: Props) {
  const { data: books = [] } = useBooks();
  const { data: loans = [] } = useLoans();
  const save = useSaveLoan();
  const [form, setForm] = useState({
    book_id: bookId ?? "",
    direction,
    counterparty: "",
    due_on: "",
    note: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({ book_id: bookId ?? "", direction, counterparty: "", due_on: "", note: "" });
  }, [open, bookId, direction]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.book_id) {
      toast.error("Pick a book first.");
      return;
    }
    const existing = activeLoan(loans, form.book_id);
    if (existing) {
      toast.error(`Already recorded — ${loanSummary(existing)}. Mark it returned first.`);
      return;
    }
    if (!form.counterparty.trim()) {
      toast.error(form.direction === "lent" ? "Who has it?" : "Who did you borrow it from?");
      return;
    }
    try {
      await save.mutateAsync({
        book_id: form.book_id,
        direction: form.direction,
        counterparty: form.counterparty.trim(),
        due_on: form.due_on || null,
        note: form.note.trim() || null,
      });
      toast.success(form.direction === "lent" ? "Marked as lent out." : "Marked as borrowed.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Record a loan</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="direction">This book is…</Label>
            <select
              id="direction"
              className={`mt-1.5 ${field}`}
              value={form.direction}
              onChange={(e) =>
                setForm((p) => ({ ...p, direction: e.target.value as "lent" | "borrowed" }))
              }
            >
              <option value="lent">Lent out to someone</option>
              <option value="borrowed">Borrowed from someone</option>
            </select>
          </div>
          <div>
            <Label htmlFor="book">Book</Label>
            <select
              id="book"
              className={`mt-1.5 ${field}`}
              value={form.book_id}
              onChange={(e) => setForm((p) => ({ ...p, book_id: e.target.value }))}
            >
              <option value="">Choose a book…</option>
              {books.map((b) => {
                const out = activeLoan(loans, b.id);
                return (
                  <option key={b.id} value={b.id} disabled={Boolean(out)}>
                    {b.title} — {b.author || "Unknown"}
                    {out ? ` (already ${out.direction === "lent" ? "lent out" : "borrowed in"})` : ""}
                  </option>
                );
              })}
            </select>
            {activeLoan(loans, form.book_id) ? (
              <p className="mt-1.5 text-[12px] text-clay">
                {loanSummary(activeLoan(loans, form.book_id)!)} already. Mark it returned before
                recording a new loan.
              </p>
            ) : form.direction === "borrowed" ? (
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                Borrowing something new? Add it to your catalogue first, then record it here.
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="who">
                {form.direction === "lent" ? "Who has it" : "Borrowed from"}
              </Label>
              <Input
                id="who"
                className="mt-1.5 rounded-xl"
                value={form.counterparty}
                onChange={(e) => setForm((p) => ({ ...p, counterparty: e.target.value }))}
                placeholder="Anitha / City Central Library"
              />
            </div>
            <div>
              <Label htmlFor="due">Due back</Label>
              <Input
                id="due"
                type="date"
                className="mt-1.5 rounded-xl"
                value={form.due_on}
                onChange={(e) => setForm((p) => ({ ...p, due_on: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              className="mt-1.5 min-h-20 rounded-xl"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Handed over at the reading circle."
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-6"
              disabled={save.isPending || Boolean(activeLoan(loans, form.book_id))}
            >
              {save.isPending ? "Saving…" : "Record loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
