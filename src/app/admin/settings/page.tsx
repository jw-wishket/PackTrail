'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Info, RotateCcw, Save } from 'lucide-react';

interface SettingItem {
  key: string;
  value: number;
}

interface SettingGroup {
  title: string;
  fields: {
    key: string;
    label: string;
    description: string;
    unit?: string;
  }[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: '예약 엔진',
    fields: [
      {
        key: 'PRE_USE_BUSINESS_DAYS',
        label: '사전 준비일',
        description: '이용 시작 전 장비 준비에 필요한 영업일 수',
        unit: '일',
      },
      {
        key: 'POST_USE_BUSINESS_DAYS',
        label: '사후 정비일',
        description: '이용 종료 후 장비 정비에 필요한 영업일 수',
        unit: '일',
      },
      {
        key: 'MIN_ADVANCE_BUSINESS_DAYS',
        label: '최소 예약 선행일',
        description: '예약 가능한 최소 영업일 수 (오늘 기준)',
        unit: '일',
      },
    ],
  },
  {
    title: '결제',
    fields: [
      {
        key: 'HOLD_DURATION_MINUTES',
        label: '홀딩 유효시간',
        description: '결제 대기(HOLDING) 상태 유지 시간',
        unit: '분',
      },
    ],
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [original, setOriginal] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, number> = {};
        for (const s of data.settings ?? []) {
          map[s.key] = typeof s.value === 'number' ? s.value : Number(s.value);
        }
        setSettings(map);
        setOriginal(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleChange(key: string, value: string) {
    const num = Number(value);
    if (isNaN(num)) return;
    setSettings((prev) => ({ ...prev, [key]: num }));
    setSaved(false);
  }

  function handleReset() {
    setSettings({ ...original });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, number> = {};
        for (const s of data.settings ?? []) {
          map[s.key] = typeof s.value === 'number' ? s.value : Number(s.value);
        }
        setSettings(map);
        setOriginal(map);
        setSaved(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">시스템 설정</h1>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-status-blue/10 p-4 text-sm text-status-blue">
        <Info className="size-5 shrink-0 mt-0.5" />
        <p>설정 변경은 새로 생성되는 예약부터 적용됩니다.</p>
      </div>

      {/* Setting groups */}
      <div className="space-y-4">
        {SETTING_GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-xl bg-white p-4 ring-1 ring-foreground/10"
          >
            <h2 className="text-sm font-semibold mb-4 border-b pb-2">
              {group.title}
            </h2>
            <div className="space-y-4">
              {group.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={field.key}
                        type="number"
                        min={0}
                        value={settings[field.key] ?? 0}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-24 text-right"
                      />
                      {field.unit && (
                        <span className="text-xs text-muted-foreground w-8">
                          {field.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save / Reset */}
      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="text-sm text-price-green mr-2">저장되었습니다.</span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!hasChanges}
        >
          <RotateCcw className="size-4 mr-1" />
          초기화
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin mr-1" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          저장
        </Button>
      </div>
    </div>
  );
}
