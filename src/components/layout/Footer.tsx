import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-footer-dark text-cream/40 py-6" aria-label="사이트 정보">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs space-y-2">
        <div className="flex items-center justify-center gap-4">
          <Link href="/terms" className="hover:text-cream/60">이용약관</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-cream/60">개인정보처리방침</Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-cream/60">고객센터</Link>
        </div>
        <p>© 2026 PackTrail. All rights reserved.</p>
      </div>
    </footer>
  );
}
