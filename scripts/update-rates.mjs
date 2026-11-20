// Update Hotel Elegant room rates in Supabase.
// Standard = price_per_night, Offer = offer_price (standard minus 20%).
// Dry run by default. Pass --apply to write.
//
// Run from the project root:
//   node --env-file=.env.local scripts/update-rates.mjs          (dry run)
//   node --env-file=.env.local scripts/update-rates.mjs --apply  (write)

import { createClient } from '@supabase/supabase-js';

const RATES = {
  'executive-king': 8000,
  'triple-sharing': 9500,
  'junior-suite': 11000,
  'family-suite': 14000,
  'presidential-suite': 16000,
};
const OFFER_DISCOUNT = 0.2;

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: rooms, error } = await supabase
  .from('rooms')
  .select('id, slug, name, price_per_night, offer_price');
if (error) {
  console.error('Read failed:', error.message);
  process.exit(1);
}

const plan = [];
for (const [slug, standard] of Object.entries(RATES)) {
  const room = rooms.find((r) => r.slug === slug);
  if (!room) {
    console.log(`MISSING slug in DB: ${slug}`);
    continue;
  }
  const offer = Math.round(standard * (1 - OFFER_DISCOUNT));
  plan.push({ id: room.id, slug, name: room.name, standard, offer,
    was: `${room.price_per_night} / ${room.offer_price ?? 'none'}` });
}

console.log(apply ? 'APPLY MODE' : 'DRY RUN (nothing written)');
console.table(plan.map(({ id, ...p }) => p));

const unknown = rooms.filter((r) => !(r.slug in RATES));
if (unknown.length) console.log('Rooms not in the rate list (left unchanged):', unknown.map((r) => r.slug).join(', '));

if (!apply) {
  console.log('Re-run with --apply to write these values.');
  process.exit(0);
}

for (const p of plan) {
  const { error: upErr } = await supabase
    .from('rooms')
    .update({ price_per_night: p.standard, offer_price: p.offer })
    .eq('id', p.id);
  console.log(upErr ? `FAILED ${p.slug}: ${upErr.message}` : `OK ${p.slug}: ${p.standard} / ${p.offer}`);
}
