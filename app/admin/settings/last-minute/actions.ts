'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeLastMinuteConfig, type LastMinuteConfig } from '@/lib/lastMinute';
import { LAST_MINUTE_SETTINGS_KEY } from '@/lib/lastMinuteConfig';

export async function saveLastMinuteConfig(input: Partial<LastMinuteConfig>) {
  await requireAdmin();
  const service = createServiceClient();

  const config = normalizeLastMinuteConfig(input);
  const { error } = await service
    .from('settings')
    .upsert({ key: LAST_MINUTE_SETTINGS_KEY, value: JSON.stringify(config) }, { onConflict: 'key' });

  if (error) return { success: false, error: error.message };

  // Pricing surfaces read the config server-side — refresh the cached ones.
  revalidatePath('/');
  revalidatePath('/rooms');
  revalidatePath('/booking');
  revalidatePath('/admin/settings/last-minute');
  return { success: true };
}
