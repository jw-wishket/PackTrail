'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-moss">PackTrail</h1>
          <p className="text-sage mt-2">백패킹 장비 렌탈 서비스</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-beige shadow-sm">
          <h2 className="text-lg font-bold text-moss mb-4">로그인</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div>
              <label className="text-sm text-sage block mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-beige rounded-lg text-sm bg-cream focus:outline-none focus:border-olive"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="text-sm text-sage block mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-beige rounded-lg text-sm bg-cream focus:outline-none focus:border-olive"
                placeholder="비밀번호"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-olive text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-olive/90 disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-beige" />
            <span className="text-xs text-muted">또는</span>
            <div className="flex-1 h-px bg-beige" />
          </div>

          <button
            onClick={handleKakaoLogin}
            className="w-full py-2.5 rounded-lg font-semibold text-sm text-[#3C1E1E]"
            style={{ backgroundColor: '#FEE500' }}
          >
            카카오로 시작하기
          </button>

          <p className="text-center text-sm text-sage mt-4">
            아직 계정이 없으신가요?{' '}
            <Link href="/auth/signup" className="text-olive font-semibold">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
