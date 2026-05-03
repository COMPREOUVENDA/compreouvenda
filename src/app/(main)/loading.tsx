import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';

export default function MainLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 space-y-4">
      {/* Search bar skeleton */}
      <div className="h-12 w-full bg-gray-200 animate-pulse rounded-2xl" aria-hidden="true" />

      {/* Categories skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-9 w-24 bg-gray-200 animate-pulse rounded-full"
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Products skeleton feed */}
      <div className="space-y-4 pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} style="feed" />
        ))}
      </div>
    </div>
  );
}
