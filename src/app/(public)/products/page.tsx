'use client';

import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductFilterTabs } from '@/components/products/ProductFilterTabs';

interface Product {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  price1night: number;
  price2night: number;
  images: any;
  includes: string[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? products
    : products.filter((p) => p.capacity === parseInt(filter));

  return (
    <div className="bg-cream min-h-screen">
      <div className="mx-auto max-w-[840px] px-4 sm:px-6">
        {/* Header */}
        <div className="pt-10 pb-4">
          <p className="text-xs text-olive font-semibold tracking-widest mb-1">EQUIPMENT SETS</p>
          <h1 className="text-2xl font-extrabold text-moss mb-2">장비 세트</h1>
          <p className="text-sm text-sage">백패킹에 필요한 모든 장비를 세트로 만나보세요.</p>
        </div>

        {/* Filter */}
        <div className="pb-6">
          <ProductFilterTabs selected={filter} onChange={setFilter} />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-sage">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-12">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
