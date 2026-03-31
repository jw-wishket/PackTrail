export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-beige animate-pulse">
      <div className="h-48 bg-beige" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-beige rounded w-3/4" />
        <div className="h-4 bg-beige rounded w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-6 bg-beige rounded w-16" />
          <div className="h-6 bg-beige rounded w-16" />
        </div>
        <div className="h-10 bg-beige rounded mt-4" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
