'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatPrice, cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Product {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  price1night: number;
  price2night: number;
  includes: string[];
  images: unknown;
}

interface Review {
  id: number;
  rating: number;
  content: string | null;
  images: unknown;
  createdAt: string;
  user: { name: string | null };
}

interface ConsumableOption {
  id: number;
  name: string;
  price: number;
}

interface ProductDetailData {
  product: Product;
  setCount: number;
  availableSets: number;
  reviews: Review[];
  reviewCount: number;
  avgRating: number;
  consumableOptions: ConsumableOption[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const productEmoji: Record<string, string> = {
  '베이직 솔로 세트': '⛺',
  '프리미엄 듀오 세트': '🏕️',
  '풀패키지 세트': '🔥',
  '라이트 솔로 세트': '🌙',
};

const equipmentEmoji: Record<string, string> = {
  텐트: '⛺',
  침낭: '💤',
  매트: '🛏️',
  버너: '🔥',
  랜턴: '🔦',
  가방: '🎒',
  테이블: '🪑',
  타프: '🏕️',
  체어: '💺',
  화로대: '🔥',
  조리: '🍳',
};

function getEquipmentEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(equipmentEmoji)) {
    if (name.includes(key)) return emoji;
  }
  return '🏕️';
}

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className={cn('inline-flex gap-0.5 text-olive', size === 'sm' ? 'text-sm' : 'text-base')}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      <span className="text-beige">{'★'.repeat(empty)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                                */
/* ------------------------------------------------------------------ */

const TABS = ['포함 장비', '이용 안내', '후기'] as const;
type Tab = typeof TABS[number];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('포함 장비');

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  /* ---------- loading / error states ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sage animate-pulse">불러오는 중...</p>
      </div>
    );
  }

  if (!data?.product) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="text-moss font-semibold">상품을 찾을 수 없습니다.</p>
        <Link href="/products" className="text-sm text-olive underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const { product, setCount, availableSets, reviews, reviewCount, avgRating } = data;
  const emoji = productEmoji[product.name] ?? '🎒';
  const productImages = Array.isArray(product.images) ? (product.images as string[]) : [];
  const hasImages = productImages.length > 0;

  /* ---------- tab content ---------- */
  const tabContent: Record<Tab, React.ReactNode> = {
    '포함 장비': (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(product.includes ?? []).map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-xl bg-cream/60 border border-beige px-4 py-3"
          >
            <span className="text-2xl">{getEquipmentEmoji(item)}</span>
            <span className="text-sm font-medium text-moss">{item}</span>
          </div>
        ))}
      </div>
    ),
    '이용 안내': (
      <div className="space-y-4 text-sm text-sage leading-relaxed">
        <div>
          <h4 className="font-semibold text-moss mb-1">배송 안내</h4>
          <p>출발일 하루 전날 오후 6시까지 배송됩니다. 산간·도서 지역은 추가 일정이 소요될 수 있습니다.</p>
        </div>
        <div>
          <h4 className="font-semibold text-moss mb-1">반납 안내</h4>
          <p>이용 종료 다음날 오후 2시까지 동봉된 반납 라벨로 택배를 발송해 주세요.</p>
        </div>
        <div>
          <h4 className="font-semibold text-moss mb-1">장비 검수</h4>
          <p>모든 장비는 반납 후 전문 팀이 세척·검수합니다. 파손 시 수리비가 청구될 수 있습니다.</p>
        </div>
        <div>
          <h4 className="font-semibold text-moss mb-1">취소 정책</h4>
          <p>출발 3일 전까지 전액 환불, 2일 전 50%, 당일 취소는 환불 불가입니다.</p>
        </div>
      </div>
    ),
    '후기': (
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center text-sage py-10">아직 후기가 없습니다.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-beige bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <StarRating rating={r.rating} size="sm" />
                <span className="text-xs text-muted">{r.user?.name ?? '익명'}</span>
                <span className="ml-auto text-xs text-muted">
                  {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
              {r.content && <p className="text-sm text-sage">{r.content}</p>}
            </div>
          ))
        )}
      </div>
    ),
  };

  return (
    <>
      <div className="min-h-screen bg-cream pb-28 lg:pb-0">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">

          {/* ===== Breadcrumb ===== */}
          <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-moss transition-colors">홈</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-moss transition-colors">장비 세트</Link>
            <span>/</span>
            <span className="text-moss font-medium truncate max-w-[160px]">{product.name}</span>
          </nav>

          {/* ===== Main Layout ===== */}
          <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">

            {/* ----- Left: Image Gallery ----- */}
            <div>
              {/* Main image */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#4A6B4A] to-[#5E7F5E] flex items-center justify-center h-72 sm:h-80 lg:h-96">
                {hasImages ? (
                  <img
                    src={productImages[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-8xl sm:text-9xl">{emoji}</span>
                )}
                <span className="absolute top-4 left-4 text-xs bg-white/90 text-moss px-2.5 py-1 rounded-full font-semibold">
                  {product.capacity}인용
                </span>
              </div>

              {/* Thumbnails */}
              <div className="mt-3 flex gap-2">
                {hasImages ? (
                  productImages.map((img, i) => (
                    <button
                      key={i}
                      className={cn(
                        'h-16 w-16 rounded-xl overflow-hidden border-2 transition-colors',
                        i === 0 ? 'border-olive' : 'border-transparent hover:border-sage'
                      )}
                    >
                      <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))
                ) : (
                  [emoji, emoji, emoji].map((e, i) => (
                    <button
                      key={i}
                      className={cn(
                        'h-16 w-16 rounded-xl overflow-hidden bg-gradient-to-br from-[#4A6B4A]/60 to-[#5E7F5E]/60 flex items-center justify-center text-2xl border-2 transition-colors',
                        i === 0 ? 'border-olive' : 'border-transparent hover:border-sage'
                      )}
                    >
                      {e}
                    </button>
                  ))
                )}
              </div>

              {/* Tabs (desktop: below gallery) */}
              <div className="mt-8 lg:block">
                <div className="flex border-b border-beige">
                  {TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
                        activeTab === tab
                          ? 'border-olive text-olive'
                          : 'border-transparent text-sage hover:text-moss'
                      )}
                    >
                      {tab === '후기' ? `후기(${reviewCount})` : tab}
                    </button>
                  ))}
                </div>
                <div className="mt-6">{tabContent[activeTab]}</div>
              </div>
            </div>

            {/* ----- Right: Info + CTA (desktop sticky) ----- */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-5">
                {/* Product name + rating */}
                <div>
                  <h1 className="text-2xl font-extrabold text-moss leading-tight">{product.name}</h1>
                  {product.description && (
                    <p className="mt-1 text-sm text-sage">{product.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <StarRating rating={avgRating} />
                    <span className="text-sm font-semibold text-olive">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-muted">({reviewCount}개 후기)</span>
                  </div>
                </div>

                {/* Price box */}
                <div className="rounded-xl border border-beige bg-white p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-sage">1박 2일</span>
                    <span className="text-xl font-bold text-price-green">{formatPrice(product.price1night)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-sage">2박 3일</span>
                    <span className="text-xl font-bold text-price-green">{formatPrice(product.price2night)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-beige">
                    <span className="text-sm text-sage">잔여 세트</span>
                    <span className={cn('text-sm font-bold', availableSets <= 1 ? 'text-destructive' : availableSets <= 2 ? 'text-warning' : 'text-price-green')}>
                      {availableSets}/{setCount}세트
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href={`/booking/${product.id}`}
                  className="block w-full rounded-xl bg-olive py-3 text-center font-bold text-white text-base shadow-sm hover:brightness-110 transition"
                >
                  예약하기
                </Link>

                {/* Service info */}
                <div className="rounded-xl border border-beige bg-white divide-y divide-beige">
                  {[
                    { icon: '🚛', label: '배송', desc: '출발일 전날 배송' },
                    { icon: '🔍', label: '검수', desc: '전문팀 세척·검수' },
                    { icon: '📖', label: '가이드', desc: '장비 사용 가이드 동봉' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-moss">{s.label}</p>
                        <p className="text-xs text-sage">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ===== Mobile: Product info (above tabs) ===== */}
          <div className="lg:hidden mt-6">
            <h1 className="text-xl font-extrabold text-moss">{product.name}</h1>
            {product.description && (
              <p className="mt-1 text-sm text-sage">{product.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <StarRating rating={avgRating} />
              <span className="text-sm font-semibold text-olive">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-muted">({reviewCount}개 후기)</span>
            </div>

            {/* Price box mobile */}
            <div className="mt-4 rounded-xl border border-beige bg-white p-4 flex justify-between">
              <div className="text-center">
                <div className="text-xs text-sage mb-0.5">1박 2일</div>
                <div className="text-lg font-bold text-price-green">{formatPrice(product.price1night)}</div>
              </div>
              <div className="w-px bg-beige" />
              <div className="text-center">
                <div className="text-xs text-sage mb-0.5">2박 3일</div>
                <div className="text-lg font-bold text-price-green">{formatPrice(product.price2night)}</div>
              </div>
            </div>

            {/* Service info mobile */}
            <div className="mt-4 rounded-xl border border-beige bg-white divide-y divide-beige">
              {[
                { icon: '🚛', label: '배송', desc: '출발일 전날 배송' },
                { icon: '🔍', label: '검수', desc: '전문팀 세척·검수' },
                { icon: '📖', label: '가이드', desc: '장비 사용 가이드 동봉' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-moss">{s.label}</p>
                    <p className="text-xs text-sage">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs mobile */}
            <div className="mt-8">
              <div className="flex border-b border-beige">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
                      activeTab === tab
                        ? 'border-olive text-olive'
                        : 'border-transparent text-sage hover:text-moss'
                    )}
                  >
                    {tab === '후기' ? `후기(${reviewCount})` : tab}
                  </button>
                ))}
              </div>
              <div className="mt-6">{tabContent[activeTab]}</div>
            </div>
          </div>

        </div>
      </div>

      {/* ===== Mobile Sticky CTA ===== */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-beige px-4 py-3 shadow-lg">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div className="flex-1">
            <div className="text-xs text-muted">1박 2일부터</div>
            <div className="text-lg font-bold text-price-green">{formatPrice(product.price1night)}</div>
          </div>
          <Link
            href={`/booking/${product.id}`}
            className="rounded-xl bg-olive px-6 py-3 font-bold text-white text-sm shadow hover:brightness-110 transition"
          >
            예약하기
          </Link>
        </div>
      </div>
    </>
  );
}
