'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen bg-[#F7F3EC] flex flex-col items-center justify-center px-4">
        <h1 className="text-4xl font-extrabold text-[#3A5A3A] mb-4">오류가 발생했습니다</h1>
        <p className="text-[#6B7C6B] mb-6">잠시 후 다시 시도해 주세요.</p>
        <button
          onClick={reset}
          className="bg-[#7BA35E] text-white px-6 py-3 rounded-lg font-semibold"
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
