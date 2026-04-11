import { Skeleton } from "@/components/ui/Skeleton";

function ProjectRowSkeleton() {
  return (
    <div className="flex h-[52px] min-h-[52px] w-full items-center gap-3 border-b border-[#e8e8e8] px-1">
      <Skeleton className="h-4 min-w-0 flex-1" />
      <Skeleton className="h-5 w-[72px] shrink-0" />
      <Skeleton className="h-5 w-[72px] shrink-0" />
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-1 w-20" />
        <Skeleton className="h-3 w-9" />
      </div>
      <Skeleton className="h-3 w-[100px] shrink-0" />
      <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
    </div>
  );
}

export default function ProjekterLoading() {
  return (
    <div className="-mx-8 px-8 py-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <ProjectRowSkeleton key={i} />
      ))}
    </div>
  );
}
