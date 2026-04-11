import { Skeleton } from "@/components/ui/Skeleton";

function TaskRowSkeleton() {
  return (
    <div className="rounded-lg border border-outline-variant/15 bg-surface-container-low/50">
      <div className="flex w-full items-center gap-3 px-4 py-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <Skeleton className="h-4 min-w-0 flex-1" />
        <Skeleton className="hidden h-5 w-8 shrink-0 rounded-full sm:block" />
        <Skeleton className="hidden h-3 w-20 shrink-0 sm:block" />
        <Skeleton className="h-5 w-16 shrink-0" />
      </div>
    </div>
  );
}

export default function ProjectDetailLoading() {
  return (
    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest shadow-sm ring-1 ring-black/5">
      <div className="border-b border-outline-variant/15 px-6 pb-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-9 w-full max-w-md" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Skeleton className="h-10 w-[140px] rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>

        <div className="mt-6 flex gap-2 border-b border-outline-variant/10 pb-px">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <TaskRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
