'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-xl p-6 border border-beige shadow-sm text-center">
          <h2 className="text-lg font-bold text-moss mb-2">이메일을 확인해주세요</h2>
          <p className="text-sm text-sage mb-4">
            {email}으로 확인 메일을 보냈습니다.<br/>
            메일의 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <Link href="/auth/login" className="text-olive font-semibold text-sm">
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-moss">PackTrail</h1>
          <p className="text-sage mt-2">회원가입</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-beige shadow-sm">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="text-sm text-sage block mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] border border-beige rounded-lg text-sm bg-cream focus:outline-none focus:border-olive"
                placeholder="홍길동"
                required
              />
            </div>
            <div>
              <label className="text-sm text-sage block mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] border border-beige rounded-lg text-sm bg-cream focus:outline-none focus:border-olive"
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
                className="w-full px-3 py-2 min-h-[44px] border border-beige rounded-lg text-sm bg-cream focus:outline-none focus:border-olive"
                placeholder="6자 이상"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-olive text-white py-2.5 min-h-[44px] rounded-lg font-semibold text-sm hover:bg-olive/90 disabled:opacity-50"
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </form>

          <p className="text-center text-sm text-sage mt-4">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/login" className="text-olive font-semibold">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
