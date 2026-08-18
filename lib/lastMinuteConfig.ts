import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeLastMinuteConfig, type LastMinuteConfig } from './lastMinute';

// Server-only read of the last-minute campaign config. Stored as a single
// JSON blob in the existing `settings` table (key = 'last_minute_config'),
// so no dedicated table/migration is needed — same store the tax rate uses.
export const LAST_MINUTE_SETTINGS_KEY = 'last_minute_config';

export async function getLastMinuteConfig(): Promise<LastMinuteConfig> {
  const service = createServiceClient();
  const { data } = await service
    .from('settings')
    .select('value')
    .eq('key', LAST_MINUTE_SETTINGS_KEY)
    .maybeSingle();

  if (!data?.value) return normalizeLastMinuteConfig(null);
  try {
    return normalizeLastMinuteConfig(JSON.parse(data.value));
  } catch {
    return normalizeLastMinuteConfig(null);
  }
}
