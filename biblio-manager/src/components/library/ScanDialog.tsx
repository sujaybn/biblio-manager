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
import { lookupIsbn, normaliseIsbn, normaliseTitle, type IsbnLookup } from "@/lib/library/isbn";
import type { Book } from "@/lib/library/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hand the fetched details to the edit form so nothing is saved blindly. */
  onFound: (details: IsbnLookup) => void;
}

export function ScanDialog({ open, onOpenChange, onFound }: Props) {
  const { data: books = [] } = useBooks();
  const [isbn, setIsbn] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [duplicate, setDuplicate] = useState<Book | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setIsbn("");
      setDuplicate(null);
      setBusy(false);
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
        // catalogue we check. Don't lose the scanned ISBN — hand it
        // straight to the manual entry form instead of a dead end.
        toast("No listing found for that ISBN — fill in the details by hand.");
        onFound({
          isbn: code,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Scan an ISBN</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Point the barcode on the back of the book at your camera, or type the ISBN. We fetch
            the author, language, genre and cover — and you can edit all of it before saving.
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
                "{duplicate.title}" by {duplicate.author || "unknown"} is already in your library,
                so nothing was added.
              </p>
            </div>
          )}
        </div>

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