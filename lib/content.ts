import { createClient, createServiceClient } from './supabase/server';

type ContentMap = Record<string, string>;

export async function getContent(): Promise<ContentMap> {
  const supabase = await createClient();
  const { data } = await supabase.from('content').select('key, value');
  const map: ContentMap = {};
  (data || []).forEach((row: { key: string; value: string | null }) => {
    if (row.value) map[row.key] = row.value;
  });
  return map;
}

/**
 * Cookie-free variant for ISR/static pages: the cookie-bound client forces
 * every request to be dynamically rendered, defeating page caching. Content
 * is public-read anyway.
 */
export async function getContentStatic(): Promise<ContentMap> {
  const supabase = createServiceClient();
  const { data } = await supabase.from('content').select('key, value');
  const map: ContentMap = {};
  (data || []).forEach((row: { key: string; value: string | null }) => {
    if (row.value) map[row.key] = row.value;
  });
  return map;
}

export async function getSettings(): Promise<ContentMap> {
  const supabase = await createClient();
  const { data } = await supabase.from('settings').select('key, value');
  const map: ContentMap = {};
  (data || []).forEach((row: { key: string; value: string | null }) => {
    if (row.value) map[row.key] = row.value;
  });
  return map;
}
