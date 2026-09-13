import { useEffect, useRef, useState } from "react";
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
import { useBooks } from "@/lib/library/api";
import {
  lookupIsbn,
  normaliseIsbn,
  normaliseTitle,
  searchBooksByTitle,
  type IsbnLookup,
} from "@/lib/library/isbn";
import type { Book } from "@/lib/library/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hand the fetched details to the edit form so nothing is saved blindly. */
  onFound: (details: IsbnLookup) => void;
}

export function ScanDialog({ open, onOpenChange, onFound }: Props) {
  const { data: books = [] } = useBooks();
  const [mode, setMode] = useState<"scan" | "title">("scan");
  const [isbn, setIsbn] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [duplicate, setDuplicate] = useState<Book | null>(null);
  const [notFoundIsbn, setNotFoundIsbn] = useState<string | null>(null);
  const [titleQuery, setTitleQuery] = useState("");
  const [titleResults, setTitleResults] = useState<IsbnLookup[]>([]);
  const [titleSearching, setTitleSearching] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  function switchMode(next: "scan" | "title") {
    setMode(next);
    setDuplicate(null);
    if (next === "title") {
      setNotFoundIsbn(null);
      stopCamera();
    } else {
      setTitleResults([]);
      void startCamera();
    }
  }

  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode("scan");
      setIsbn("");
      setDuplicate(null);
      setBusy(false);
      setNotFoundIsbn(null);
      setTitleQuery("");
      setTitleResults([]);
      return;
    }
    // Mobile-first: get straight to scanning without an extra tap. If the
    // camera isn't available (denied, no camera, desktop without one),
    // startCamera() already falls back gracefully to manual ISBN entry.
    void startCamera();
    return stopCamera;
  }, [open]);

  async function startCamera() {
    setDuplicate(null);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      setScanning(true);
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result) => {
          if (!result) return;
          const code = normaliseIsbn(result.getText());
          if (!code) return;
          stopCamera();
          setIsbn(code);
          void handleLookup(code);
        },
      );
      controlsRef.current = controls;
    } catch {
      setScanning(false);
      toast.error("Could not reach the camera. You can type the ISBN instead.");
    }
  }

  async function handleLookup(raw: string) {
    const code = normaliseIsbn(raw);
    if (!code) {
      toast.error("That doesn't look like a 10 or 13 digit ISBN.");
      return;
    }
    setDuplicate(null);
    setBusy(true);
    try {
      const found = await lookupIsbn(code);
      if (!found) {
        // Small/regional-language presses are often missing from every
        // catalogue we check by ISBN. Offer a title search before giving up
        // entirely — don't lose the scanned ISBN either way.
        setNotFoundIsbn(code);
        return;
      }
      const existing = books.find(
        (b) => normaliseTitle(b.title) === normaliseTitle(found.title),
      );
      if (existing) {
        setDuplicate(existing);
        return;
      }
      onFound(found);
      onOpenChange(false);
    } catch {
      toast.error("Could not look that ISBN up just now.");
    } finally {
      setBusy(false);
    }
  }

  async function searchTitle() {
    if (!titleQuery.trim()) return;
    setTitleSearching(true);
    try {
      const results = await searchBooksByTitle(titleQuery.trim());
      setTitleResults(results);
      if (results.length === 0) {
        toast("No matches for that title either — you can still add it by hand.");
      }
    } catch {
      toast.error("Could not search just now.");
    } finally {
      setTitleSearching(false);
    }
  }

  function pickTitleResult(result: IsbnLookup) {
    // Keep the ISBN actually printed on this physical copy, even though the
    // matched Google Books record may show a different edition's ISBN.
    onFound({ ...result, isbn: notFoundIsbn ?? result.isbn });
    onOpenChange(false);
  }

  function skipToManualEntry() {
    onFound({
      isbn: notFoundIsbn ?? "",
      title: "",
      author: "",
      language: "",
      genre: "",
      year: "",
      page_count: "",
      cover_url: "",
      source: "Manual entry",
    });
    onOpenChange(false);
  }

  function renderTitleSearchBox() {
    return (
      <>
        <div className="mt-3 flex gap-2">
          <Input
            className="rounded-xl"
            value={titleQuery}
            onChange={(e) => setTitleQuery(e.target.value)}
            placeholder="Title, or title and author"
            onKeyDown={(e) => {
              if (e.key === "Enter") void searchTitle();
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-full px-4"
            disabled={titleSearching || !titleQuery.trim()}
            onClick={() => void searchTitle()}
          >
            {titleSearching ? "Searching…" : "Search"}
          </Button>
        </div>

        {titleResults.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {titleResults.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickTitleResult(result)}
                className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-secondary"
              >
                {result.cover_url ? (
                  <img
                    src={result.cover_url}
                    alt=""
                    className="h-12 w-8 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <div className="h-12 w-8 shrink-0 rounded-sm bg-muted" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13.5px]">{result.title}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {result.author || "Unknown author"}
                    {result.year ? ` · ${result.year}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={skipToManualEntry}
          className="mt-3 text-[12.5px] text-muted-foreground underline underline-offset-2"
        >
          None of these — just let me fill it in by hand
        </button>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "scan" ? "Add a book" : "Search by title"}
          </DialogTitle>
        </DialogHeader>

        <div className="inline-flex rounded-full bg-secondary p-1">
          <button
            type="button"
            onClick={() => switchMode("scan")}
            className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
              mode === "scan" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            Scan / ISBN
          </button>
          <button
            type="button"
            onClick={() => switchMode("title")}
            className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${
              mode === "title" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            Search by title
          </button>
        </div>

        {mode === "scan" ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Point the barcode on the back of the book at your camera, or type the ISBN. We
              fetch the author, language, genre and cover — and you can edit all of it before
              saving.
            </p>

            <div className="overflow-hidden rounded-2xl bg-secondary">
              <video
                ref={videoRef}
                className={`aspect-video w-full object-cover ${scanning ? "" : "hidden"}`}
                muted
                playsInline
              />
              {!scanning && (
                <div className="flex aspect-video items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={startCamera}
                  >
                    Use camera
                  </Button>
                </div>
              )}
            </div>
            {scanning && (
              <button
                type="button"
                className="text-[13px] text-muted-foreground underline underline-offset-2"
                onClick={stopCamera}
              >
                Stop the camera
              </button>
            )}

            <div>
              <Label htmlFor="isbn">ISBN</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="isbn"
                  className="rounded-xl"
                  value={isbn}
                  onChange={(e) => {
                    setIsbn(e.target.value);
                    setDuplicate(null);
                  }}
                  placeholder="9788172016470"
                  inputMode="numeric"
                />
                <Button
                  type="button"
                  className="rounded-full px-5"
                  disabled={busy || !isbn.trim()}
                  onClick={() => void handleLookup(isbn)}
                >
                  {busy ? "Looking…" : "Look up"}
                </Button>
              </div>
            </div>

            {duplicate && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="font-display text-[15px] text-primary">Book is already there</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  "{duplicate.title}" by {duplicate.author || "unknown"} is already in your
                  library, so nothing was added.
                </p>
              </div>
            )}

            {notFoundIsbn && (
              <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                <p className="font-display text-[15px]">No listing for that ISBN</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  This happens most with small or independent presses. Try searching by title
                  instead — it sometimes finds editions the ISBN index misses.
                </p>
                {renderTitleSearchBox()}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Handy for books with no barcode to scan, or ones whose ISBN just isn't catalogued
              anywhere — search by title (and author, if you like) instead.
            </p>
            {duplicate && (
              <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="font-display text-[15px] text-primary">Book is already there</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  "{duplicate.title}" by {duplicate.author || "unknown"} is already in your
                  library, so nothing was added.
                </p>
              </div>
            )}
            {renderTitleSearchBox()}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}