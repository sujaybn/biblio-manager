import { useState } from "react";
import { Star } from "lucide-react";

import { useUpdateRating } from "@/lib/library/api";

/**
 * A clickable 1–5 star rating. Click a star to set the rating; click the
 * currently-set star again to clear it. Works as a quick-rate control
 * anywhere a book appears — no need to open the full edit form.
 */
export function StarRating({
  bookId,
  rating,
  size = "sm",
}: {
  bookId: string;
  rating: number | null;
  size?: "sm" | "md";
}) {
  const update = useUpdateRating();
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? rating ?? 0;
  const dims = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
      role="radiogroup"
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={rating === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="rounded-sm p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onMouseEnter={() => setHover(n)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = rating === n ? null : n;
            update.mutate({ id: bookId, rating: next });
          }}
        >
          <Star
            className={`${dims} ${n <= shown ? "fill-clay text-clay" : "fill-none text-muted-foreground"}`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}