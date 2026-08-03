import { ListSkeleton, Skeleton } from '@/components/ui/states';

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <ListSkeleton rows={4} />
    </div>
  );
}
