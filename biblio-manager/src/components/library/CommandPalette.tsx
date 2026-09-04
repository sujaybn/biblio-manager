import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, Download, Heart, LayoutGrid, ListTree, Repeat, Sparkles } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useBooks } from "@/lib/library/api";

const DESTINATIONS = [
  { to: "/library", label: "Library", icon: LayoutGrid },
  { to: "/reading", label: "Reading", icon: BookOpen },
  { to: "/wishlist", label: "Wish list", icon: Heart },
  { to: "/notes", label: "Notes", icon: Sparkles },
  { to: "/lending", label: "Lending", icon: Repeat },
  { to: "/stats", label: "Stats", icon: ListTree },
  { to: "/backup", label: "Backup", icon: Download },
] as const;

/** Global ⌘K / Ctrl+K command palette: jump straight to any book, or to any
 * page in the app, without hunting through the nav. Controlled so a header
 * button can open it too, alongside the keyboard shortcut. */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: books = [] } = useBooks();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  function go(to: string, params?: Record<string, string>) {
    onOpenChange(false);
    navigate(params ? { to, params } : { to });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to a book, or a page…" />
      <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>
        <CommandGroup heading="Go to">
          {DESTINATIONS.map((d) => (
            <CommandItem key={d.to} value={d.label} onSelect={() => go(d.to)}>
              <d.icon className="mr-2 h-4 w-4" />
              {d.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Books">
          {books.map((book) => (
            <CommandItem
              key={book.id}
              value={`${book.title} ${book.author}`}
              onSelect={() => go("/book/$bookId", { bookId: book.id })}
            >
              <BookOpen className="mr-2 h-4 w-4 shrink-0 opacity-60" />
              <span className="truncate">{book.title}</span>
              {book.author && (
                <span className="ml-2 truncate text-muted-foreground">— {book.author}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}