import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';

export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 space-y-4">
      <div className="h-12 w-full bg-gray-200 animate-pulse rounded-2xl" aria-hidden="true" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} style="card" />
        ))}
      </div>
    </div>
  );
}
