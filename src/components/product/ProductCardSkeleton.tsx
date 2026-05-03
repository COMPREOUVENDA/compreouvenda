import { Skeleton } from '@/components/ui/Skeleton';

export function ProductCardSkeleton({ style = 'card' }: { style?: 'card' | 'feed' }) {
  if (style === 'feed') {
    return (
      <div className="relative aspect-[3/4] rounded-3xl overflow-hidden" aria-hidden="true">
        <Skeleton className="absolute inset-0 rounded-3xl" />
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <Skeleton className="h-6 w-1/3 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-3.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-3 w-2/3 rounded-lg" />
        <div className="flex items-end justify-between pt-1">
          <Skeleton className="h-6 w-20 rounded-lg" />
          <Skeleton className="h-3 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeletonFeed() {
  return <ProductCardSkeleton style="feed" />;
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto" aria-hidden="true">
      {/* Image */}
      <Skeleton className="aspect-[4/5] md:aspect-[16/10] w-full rounded-none" />

      {/* Content */}
      <div className="px-4 py-5 space-y-5 -mt-6 relative z-10">
        {/* Title card */}
        <div className="card-elevated p-5 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-8 w-3/4 rounded-xl" />
          <Skeleton className="h-10 w-1/3 rounded-xl" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-lg" />
          </div>
        </div>

        {/* Seller card */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Description card */}
        <div className="card-elevated p-5 space-y-2">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-3 w-full rounded-lg" />
          <Skeleton className="h-3 w-5/6 rounded-lg" />
          <Skeleton className="h-3 w-4/5 rounded-lg" />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1 rounded-2xl" />
          <Skeleton className="h-12 w-24 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
