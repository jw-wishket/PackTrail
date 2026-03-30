'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Pencil, XCircle } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  price1night: number;
  price2night: number;
  images: string[];
  includes: string[];
  sortOrder: number;
  isActive: boolean;
  _count?: { reservations: number };
}

interface Consumable {
  id: number;
  name: string;
  description: string | null;
  price: number;
  sortOrder: number;
  isActive: boolean;
}

const emptyProduct = {
  name: '',
  description: '',
  capacity: 1,
  price1night: 0,
  price2night: 0,
  includes: '',
  sortOrder: 0,
  isActive: true,
};

const emptyConsumable = {
  name: '',
  description: '',
  price: 0,
  sortOrder: 0,
  isActive: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [loading, setLoading] = useState(true);

  // Product dialog
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  // Consumable dialog
  const [consumableOpen, setConsumableOpen] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<number | null>(null);
  const [consumableForm, setConsumableForm] = useState(emptyConsumable);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/products').then((r) => r.json()),
      fetch('/api/admin/consumables').then((r) => r.json()),
    ])
      .then(([pData, cData]) => {
        setProducts(pData.products ?? []);
        setConsumables(cData.consumables ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function openProductEdit(product: Product) {
    setEditingProduct(product.id);
    setProductForm({
      name: product.name,
      description: product.description ?? '',
      capacity: product.capacity,
      price1night: product.price1night,
      price2night: product.price2night,
      includes: product.includes.join(', '),
      sortOrder: product.sortOrder,
      isActive: product.isActive,
    });
    setProductOpen(true);
  }

  function openProductCreate() {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setProductOpen(true);
  }

  async function saveProduct() {
    setSaving(true);
    try {
      const body = {
        name: productForm.name,
        description: productForm.description || null,
        capacity: Number(productForm.capacity),
        price1night: Number(productForm.price1night),
        price2night: Number(productForm.price2night),
        includes: productForm.includes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        sortOrder: Number(productForm.sortOrder),
        isActive: productForm.isActive,
      };

      let res: Response;
      if (editingProduct) {
        res = await fetch(`/api/admin/products/${editingProduct}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        const refreshed = await fetch('/api/admin/products').then((r) => r.json());
        setProducts(refreshed.products ?? []);
        setProductOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function deactivateProduct(id: number) {
    if (!confirm('이 상품을 비활성화하시겠습니까?')) return;
    try {
      await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: false } : p))
      );
    } catch (err) {
      console.error(err);
    }
  }

  function openConsumableEdit(c: Consumable) {
    setEditingConsumable(c.id);
    setConsumableForm({
      name: c.name,
      description: c.description ?? '',
      price: c.price,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    });
    setConsumableOpen(true);
  }

  function openConsumableCreate() {
    setEditingConsumable(null);
    setConsumableForm(emptyConsumable);
    setConsumableOpen(true);
  }

  async function saveConsumable() {
    setSaving(true);
    try {
      const body = {
        name: consumableForm.name,
        description: consumableForm.description || null,
        price: Number(consumableForm.price),
        sortOrder: Number(consumableForm.sortOrder),
        isActive: consumableForm.isActive,
      };

      let res: Response;
      if (editingConsumable) {
        res = await fetch(`/api/admin/consumables/${editingConsumable}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/admin/consumables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        const refreshed = await fetch('/api/admin/consumables').then((r) => r.json());
        setConsumables(refreshed.consumables ?? []);
        setConsumableOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Products section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">상품 관리</h1>
          <Button size="sm" onClick={openProductCreate}>
            <Plus className="size-4 mr-1" />
            상품 추가
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className={cn(
                'rounded-xl bg-white p-4 ring-1 ring-foreground/10',
                !p.isActive && 'opacity-50'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  {!p.isActive && (
                    <span className="text-xs text-destructive">비활성</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => openProductEdit(p)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  {p.isActive && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deactivateProduct(p.id)}
                    >
                      <XCircle className="size-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {p.description ?? '설명 없음'}
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">수용인원</span>
                  <span>{p.capacity}인</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1박</span>
                  <span className="font-medium">{p.price1night.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">2박</span>
                  <span className="font-medium">{p.price2night.toLocaleString()}원</span>
                </div>
                {p.includes.length > 0 && (
                  <div className="pt-1 border-t mt-1">
                    <span className="text-muted-foreground">포함: </span>
                    <span>{p.includes.join(', ')}</span>
                  </div>
                )}
                {p._count && (
                  <div className="flex justify-between pt-1 border-t mt-1">
                    <span className="text-muted-foreground">총 예약</span>
                    <span>{p._count.reservations}건</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Consumables section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">소모품 옵션</h2>
          <Button size="sm" variant="outline" onClick={openConsumableCreate}>
            <Plus className="size-4 mr-1" />
            옵션 추가
          </Button>
        </div>

        <div className="rounded-xl bg-white ring-1 ring-foreground/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-admin-bg">
                <th className="px-4 py-2.5 text-left font-medium">이름</th>
                <th className="px-4 py-2.5 text-left font-medium">가격</th>
                <th className="px-4 py-2.5 text-left font-medium">상태</th>
                <th className="px-4 py-2.5 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {consumables.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">{c.name}</td>
                  <td className="px-4 py-2.5">{c.price.toLocaleString()}원</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                        c.isActive
                          ? 'bg-price-green/10 text-price-green'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {c.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => openConsumableEdit(c)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {consumables.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    등록된 소모품 옵션이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Dialog */}
      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? '상품 수정' : '상품 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>상품명</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>설명</Label>
              <Input
                value={productForm.description}
                onChange={(e) =>
                  setProductForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>수용인원</Label>
                <Input
                  type="number"
                  min={1}
                  value={productForm.capacity}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, capacity: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <Label>정렬순서</Label>
                <Input
                  type="number"
                  value={productForm.sortOrder}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>1박 가격 (원)</Label>
                <Input
                  type="number"
                  min={0}
                  value={productForm.price1night}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, price1night: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <Label>2박 가격 (원)</Label>
                <Input
                  type="number"
                  min={0}
                  value={productForm.price2night}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, price2night: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>포함 항목 (쉼표 구분)</Label>
              <Input
                value={productForm.includes}
                onChange={(e) =>
                  setProductForm((f) => ({ ...f, includes: e.target.value }))
                }
                placeholder="텐트, 타프, 테이블..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="product-active"
                checked={productForm.isActive}
                onChange={(e) =>
                  setProductForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="rounded"
              />
              <Label htmlFor="product-active">활성 상태</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductOpen(false)}>
              취소
            </Button>
            <Button onClick={saveProduct} disabled={saving || !productForm.name}>
              {saving && <Loader2 className="size-3 animate-spin mr-1" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consumable Dialog */}
      <Dialog open={consumableOpen} onOpenChange={setConsumableOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingConsumable ? '옵션 수정' : '옵션 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>이름</Label>
              <Input
                value={consumableForm.name}
                onChange={(e) =>
                  setConsumableForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>설명</Label>
              <Input
                value={consumableForm.description}
                onChange={(e) =>
                  setConsumableForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>가격 (원)</Label>
                <Input
                  type="number"
                  min={0}
                  value={consumableForm.price}
                  onChange={(e) =>
                    setConsumableForm((f) => ({ ...f, price: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <Label>정렬순서</Label>
                <Input
                  type="number"
                  value={consumableForm.sortOrder}
                  onChange={(e) =>
                    setConsumableForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="consumable-active"
                checked={consumableForm.isActive}
                onChange={(e) =>
                  setConsumableForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="rounded"
              />
              <Label htmlFor="consumable-active">활성 상태</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsumableOpen(false)}>
              취소
            </Button>
            <Button
              onClick={saveConsumable}
              disabled={saving || !consumableForm.name}
            >
              {saving && <Loader2 className="size-3 animate-spin mr-1" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
