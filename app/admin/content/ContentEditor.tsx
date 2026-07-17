'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props { content: Record<string, string>; }

const fields = [
  { key: 'hero_video_url', label: 'Hero Video URL', type: 'url', hint: 'MP4 video URL. Leave empty to show the poster image only.' },
  { key: 'hero_poster_url', label: 'Hero Poster / Fallback Image URL', type: 'url', hint: 'Used when video is absent or still loading.' },
  { key: 'hero_heading', label: 'Hero Heading', type: 'text' },
  { key: 'hero_subheading', label: 'Hero Subheading', type: 'text' },
  { key: 'dining_heading', label: 'Dining Heading', type: 'text' },
  { key: 'dining_text', label: 'Dining Description', type: 'textarea' },
  { key: 'about_story', label: 'About — Our Story', type: 'textarea' },
];

export default function ContentEditor({ content }: Props) {
  const [values, setValues] = useState<Record<string, string>>(content);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');
    setSaved(false);
    startTransition(async () => {
      const supabase = createClient();
      const updates = fields.map((f) => ({
        key: f.key, value: values[f.key] || '',
      }));
      for (const update of updates) {
        const { error: upsertError } = await supabase
          .from('content')
          .upsert(update, { onConflict: 'key' });
        if (upsertError) {
          setError(
            `Could not save "${update.key}": ${upsertError.message}. ` +
            'If this mentions permissions, your account may not be an admin.'
          );
          return;
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <div className="max-w-2xl bg-white border border-gray-100 p-8 space-y-6">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-1.5">
            {f.label}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              rows={4}
              className="w-full border border-gray-200 px-4 py-2.5 font-montserrat text-sm outline-none focus:border-[#1A0B2E] transition-colors resize-none"
            />
          ) : (
            <input
              type={f.type}
              value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full border border-gray-200 px-4 py-2.5 font-montserrat text-sm outline-none focus:border-[#1A0B2E] transition-colors"
            />
          )}
          {f.hint && <p className="text-xs font-montserrat text-gray-400 mt-1">{f.hint}</p>}
        </div>
      ))}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-montserrat">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm font-montserrat">
          Content saved! Changes will appear on the website.
        </div>
      )}

      <button onClick={handleSave} disabled={isPending} className="btn-red w-full py-3 disabled:opacity-50">
        {isPending ? 'Saving...' : 'Save Content'}
      </button>
    </div>
  );
}
