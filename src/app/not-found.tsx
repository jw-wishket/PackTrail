import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-extrabold text-moss mb-4">404</h1>
      <p className="text-lg text-sage mb-6">페이지를 찾을 수 없습니다</p>
      <Link
        href="/"
        className="bg-olive text-white px-6 py-3 rounded-lg font-semibold hover:bg-olive/90 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
