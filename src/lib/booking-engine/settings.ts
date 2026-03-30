import { prisma } from '@/lib/prisma';

interface SystemSettings {
  PRE_USE_BUSINESS_DAYS: number;
  POST_USE_BUSINESS_DAYS: number;
  MIN_ADVANCE_BUSINESS_DAYS: number;
  HOLD_DURATION_MINUTES: number;
  TOTAL_SETS: number;
}

const DEFAULTS: SystemSettings = {
  PRE_USE_BUSINESS_DAYS: 3,
  POST_USE_BUSINESS_DAYS: 4,
  MIN_ADVANCE_BUSINESS_DAYS: 3,
  HOLD_DURATION_MINUTES: 10,
  TOTAL_SETS: 10,
};

let cache: { data: SystemSettings; expiresAt: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function getSystemSettings(): Promise<SystemSettings> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const rows = await prisma.systemSetting.findMany();
  const settings = { ...DEFAULTS };

  for (const row of rows) {
    const key = row.key as keyof SystemSettings;
    if (key in settings) {
      settings[key] = typeof row.value === 'number' ? row.value : Number(row.value);
    }
  }

  cache = { data: settings, expiresAt: Date.now() + CACHE_TTL };
  return settings;
}

export async function getSystemSetting<K extends keyof SystemSettings>(
  key: K
): Promise<SystemSettings[K]> {
  const settings = await getSystemSettings();
  return settings[key];
}

export function invalidateSettingsCache(): void {
  cache = null;
}
