import { Skeleton } from '@/components/ui/Skeleton';

export default function OrdersLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
      <Skeleton className="h-8 w-40 rounded-xl mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-elevated p-4 space-y-3" aria-hidden="true">
          <div className="flex items-center gap-3">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-3 w-1/2 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex justify-between items-center pt-1">
            <Skeleton className="h-5 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
