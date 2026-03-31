'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-extrabold text-moss mb-4">오류가 발생했습니다</h1>
      <p className="text-sage mb-6">잠시 후 다시 시도해 주세요.</p>
      <button
        onClick={reset}
        className="bg-olive text-white px-6 py-3 rounded-lg font-semibold hover:bg-olive/90 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
