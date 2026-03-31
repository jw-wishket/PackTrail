import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

interface Props {
  product: {
    id: number;
    name: string;
    description: string | null;
    capacity: number;
    price1night: number;
    price2night: number;
    images?: unknown;
    includes: string[];
  };
}

const capacityEmoji: Record<string, string> = {
  '베이직 솔로 세트': '⛺',
  '프리미엄 듀오 세트': '🏕️',
  '풀패키지 세트': '🔥',
  '라이트 솔로 세트': '🌙',
};

export function ProductCard({ product }: Props) {
  const emoji = capacityEmoji[product.name] || '🎒';
  const gearTags = (product.includes as string[]).slice(0, 4);
  const extraCount = (product.includes as string[]).length - 4;

  return (
    <div role="article" aria-label={product.name} className="bg-white rounded-xl overflow-hidden shadow-sm border border-beige">
      {/* Image area */}
      <div className="h-44 sm:h-48 bg-gradient-to-br from-[#4A6B4A] to-[#5E7F5E] flex items-center justify-center relative">
        {Array.isArray(product.images) && (product.images as string[]).length > 0 ? (
          <img
            src={(product.images as string[])[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl">{emoji}</span>
        )}
        <span className="absolute top-3 left-3 text-xs bg-white/90 text-moss px-2 py-0.5 rounded font-semibold">
          {product.capacity}인용
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-moss mb-1">{product.name}</h3>
        <p className="text-sm text-sage mb-3">{product.description}</p>

        {/* Gear tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {gearTags.map((tag) => (
            <span key={tag} className="text-xs bg-cream text-sage px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="text-xs bg-cream text-sage px-2 py-0.5 rounded">
              +{extraCount}
            </span>
          )}
        </div>

        {/* Prices */}
        <div className="flex justify-between items-center pt-3 border-t border-beige mb-4">
          <div>
            <div className="text-xs text-muted">1박 2일</div>
            <div className="text-lg font-bold text-price-green">{formatPrice(product.price1night)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">2박 3일</div>
            <div className="text-lg font-bold text-price-green">{formatPrice(product.price2night)}</div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/booking/${product.id}`}
          className="block text-center bg-olive text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-olive/90 transition-colors"
        >
          예약하기
        </Link>
      </div>
    </div>
  );
}
