'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || content.trim().length < 10) {
      setError('별점을 선택하고 10자 이상 작성해 주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: params.id,
          rating,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || '후기 등록에 실패했습니다.');
        return;
      }

      router.push(`/my/reservations/${params.id}`);
    } catch {
      setError('후기 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-lg px-4 py-6">
        <Link href={`/my/reservations/${params.id}`} className="text-sm text-sage hover:text-moss mb-4 inline-block">
          &larr; 예약 상세
        </Link>

        <h1 className="text-xl font-bold text-moss mb-6">후기 작성</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star rating */}
          <div className="rounded-xl border border-beige bg-white p-6 text-center">
            <p className="text-sm font-semibold text-moss mb-3">캠핑 경험은 어떠셨나요?</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="text-3xl transition-transform hover:scale-110"
                >
                  <span className={displayRating >= star ? 'text-olive' : 'text-beige'}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-sage">
              {displayRating === 0 && '별점을 선택해 주세요'}
              {displayRating === 1 && '별로예요'}
              {displayRating === 2 && '그저 그래요'}
              {displayRating === 3 && '보통이에요'}
              {displayRating === 4 && '좋아요'}
              {displayRating === 5 && '최고예요!'}
            </p>
          </div>

          {/* Text content */}
          <div>
            <label className="block text-sm font-semibold text-moss mb-2">
              후기 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="캠핑 경험을 공유해 주세요 (10자 이상)"
              rows={6}
              className={cn(
                'w-full rounded-xl border border-beige bg-white px-4 py-3 text-sm text-moss placeholder:text-muted',
                'focus:outline-none focus:border-olive focus:ring-2 focus:ring-olive/20',
                'resize-none',
              )}
            />
            <div className="flex justify-between mt-1">
              <span className={cn('text-xs', content.length < 10 ? 'text-warning' : 'text-sage')}>
                {content.length < 10 ? `${10 - content.length}자 더 작성해 주세요` : ''}
              </span>
              <span className="text-xs text-sage">{content.length}/2000</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || rating === 0 || content.trim().length < 10}
            className="w-full rounded-xl bg-olive py-3 text-sm font-bold text-white shadow hover:brightness-110 transition disabled:opacity-40"
          >
            {submitting ? '등록 중...' : '후기 등록'}
          </button>
        </form>
      </div>
    </div>
  );
}
