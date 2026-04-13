import { Skeleton } from "@/components/ui/Skeleton";

function SkeletonRow() {
  return (
    <tr className="border-b border-[#e8e8e8] last:border-b-0">
      <td className="px-4 py-[14px]">
        <Skeleton className="h-4 w-[min(100%,220px)]" />
      </td>
      <td className="px-4 py-[14px]">
        <Skeleton className="h-5 w-20 rounded-full" />
      </td>
      <td className="px-4 py-[14px]">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="px-4 py-[14px]">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-4 py-[14px]">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-1 w-[120px] rounded-[2px]" />
          <Skeleton className="h-4 w-8" />
        </div>
      </td>
      <td className="px-4 py-[14px] text-right">
        <Skeleton className="ml-auto h-7 w-7 rounded-full" />
      </td>
    </tr>
  );
}

export function ProjectListSkeleton() {
  return (
    <div className="-mx-8 px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-10 w-52 rounded-lg" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="overflow-hidden rounded-[8px] border border-[#e8e8e8] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse">
            <thead className="bg-[#f8f9fa]">
              <tr className="border-b border-[#e8e8e8]">
                <th className="w-[28%] px-4 py-[10px] text-left">
                  <Skeleton className="h-3 w-24" />
                </th>
                <th className="w-[14%] px-4 py-[10px] text-left">
                  <Skeleton className="h-3 w-14" />
                </th>
                <th className="w-[14%] px-4 py-[10px] text-left">
                  <Skeleton className="h-3 w-16" />
                </th>
                <th className="w-[14%] px-4 py-[10px] text-left">
                  <Skeleton className="h-3 w-12" />
                </th>
                <th className="w-[22%] px-4 py-[10px] text-left">
                  <Skeleton className="h-3 w-20" />
                </th>
                <th className="w-[8%] px-4 py-[10px] text-right">
                  <Skeleton className="ml-auto h-3 w-10" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-6 flex justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-40" />
      </div>
    </div>
  );
}
