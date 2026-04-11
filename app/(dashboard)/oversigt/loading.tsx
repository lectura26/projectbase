import { Skeleton } from "@/components/ui/Skeleton";

export default function OversigtLoading() {
  return (
    <div className="min-w-0 pb-10">
      <header className="mb-8">
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="mt-2 h-4 w-56 max-w-full" />
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-10">
        {/* Left column */}
        <div className="min-w-0 space-y-10">
          <section>
            <Skeleton className="mb-3 h-3 w-44" />
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm ring-1 ring-black/[0.03]">
              <ul className="divide-y divide-outline-variant/15">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex min-h-[44px] items-center gap-3 px-4 py-2">
                    <Skeleton className="h-[18px] w-[18px] shrink-0 rounded" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-full max-w-[280px]" />
                      <Skeleton className="h-3 w-40 max-w-full" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0" />
                    <Skeleton className="h-3 w-10 shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <Skeleton className="mb-3 h-3 w-28" />
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm ring-1 ring-black/[0.03]">
              <ul className="divide-y divide-outline-variant/15">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="flex min-h-[44px] items-center gap-3 px-4 py-2">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-4 min-w-0 flex-1" />
                    <Skeleton className="h-5 w-20 shrink-0" />
                    <Skeleton className="h-1.5 w-20 shrink-0" />
                    <Skeleton className="h-3 w-24 shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-10">
          <section>
            <Skeleton className="mb-3 h-3 w-36" />
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm ring-1 ring-black/[0.03]">
              <ul className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="flex gap-3">
                    <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-full max-w-xs" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <Skeleton className="mb-3 h-3 w-36" />
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm ring-1 ring-black/[0.03]">
              <ul className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <li key={i} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-48 max-w-full" />
                    </div>
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
