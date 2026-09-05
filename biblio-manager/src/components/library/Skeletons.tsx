import { Skeleton } from "@/components/ui/skeleton";

/** Matches BookCard's layout so the loading state doesn't jump around once
 * real content arrives. */
export function BookCardSkeleton() {
  return (
    <div className="paper flex gap-4 p-4">
      <Skeleton className="h-24 w-16 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2.5 py-0.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function BookGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** A single-row list-item skeleton, for pages like Lending/Notes that show
 * one wider entry per row instead of a card grid. */
export function ListRowSkeleton() {
  return (
    <div className="paper flex items-center gap-4 p-4">
      <Skeleton className="h-14 w-10 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches the book detail page's header layout. */
export function BookDetailSkeleton() {
  return (
    <div className="flex gap-6">
      <Skeleton className="h-44 w-28 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-3 py-1">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}