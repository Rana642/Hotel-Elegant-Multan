import { createClient } from './supabase/server';

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

export async function getSettings(): Promise<ContentMap> {
  const supabase = await createClient();
  const { data } = await supabase.from('settings').select('key, value');
  const map: ContentMap = {};
  (data || []).forEach((row: { key: string; value: string | null }) => {
    if (row.value) map[row.key] = row.value;
  });
  return map;
}
