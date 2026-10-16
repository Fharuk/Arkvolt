import type { StoreSettings } from '@arkvolt/shared';
import { prisma } from '../db';
import { env } from '../config';
import { logger } from './logger';

const SETTINGS_ID = 'singleton';

/**
 * Every value the storefront needs to render, in one row. The seed writes the
 * real business values; this default exists so a fresh database still renders
 * a coherent site rather than blank fields.
 */
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'ARKVOLT',
  tagline: 'Software supply and hardware repair for machines that have to work.',
  whatsappNumber: env.WHATSAPP_NUMBER,
  supportPhone: '',
  supportEmail: '',
  workshopAddress: '',
  workshopHours: 'Mon–Sat, 09:00–19:00 WAT',
  announcement: null,
  announcementEnabled: false,
  bankDetails: null,
  deliveryFeeKobo: 0,
  freeDeliveryThresholdKobo: 0,
  currency: 'NGN',
  socials: [],
};

let cache: { value: StoreSettings; expiresAt: number } | null = null;
const TTL_MS = 15_000;

export const getSettings = async (options: { bypassCache?: boolean } = {}): Promise<StoreSettings> => {
  if (!options.bypassCache && cache && cache.expiresAt > Date.now()) return cache.value;

  try {
    const row = await prisma.setting.findUnique({ where: { id: SETTINGS_ID } });
    const value = row ? ({ ...DEFAULT_SETTINGS, ...(row.data as Partial<StoreSettings>) } as StoreSettings) : DEFAULT_SETTINGS;
    cache = { value, expiresAt: Date.now() + TTL_MS };
    return value;
  } catch (err) {
    // A settings read must never take the storefront down.
    logger.error('Settings read failed, serving defaults', {
      message: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (next: StoreSettings): Promise<StoreSettings> => {
  const merged = { ...DEFAULT_SETTINGS, ...next };
  await prisma.setting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, data: merged },
    update: { data: merged },
  });
  cache = { value: merged, expiresAt: Date.now() + TTL_MS };
  return merged;
};

export const invalidateSettingsCache = (): void => {
  cache = null;
};
