'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  addTrackedCreator,
  removeTrackedCreator,
  type TrackedCreatorRow,
} from '@/lib/swipes/tracked-creators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// פנל "יוצרים שאני עוקב" — הוספה והסרה של ערוצים נוספים
export function TrackedCreatorsPanel({
  creators,
}: {
  creators: TrackedCreatorRow[];
}) {
  const t = useTranslations('swipes');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <form
        action={(fd) => {
          setError(null);
          start(async () => {
            const r = await addTrackedCreator(fd);
            if (!r.ok) setError(r.error);
          });
        }}
        className="flex gap-2"
      >
        <Input
          name="channel_url"
          placeholder="https://youtube.com/@creator"
          required
          disabled={pending}
        />
        <Button type="submit" disabled={pending}>
          {t('add_creator')}
        </Button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {creators.length > 0 && (
        <ul className="divide-y divide-zinc-800 rounded border border-zinc-800">
          {creators.map((c) => (
            <li key={c.channel_id} className="flex items-center gap-3 py-2 px-3">
              {c.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.thumbnail_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-zinc-700" />
              )}
              <span className="flex-1 truncate text-sm">{c.channel_title}</span>
              <form
                action={(fd) => {
                  fd.set('channel_id', c.channel_id);
                  start(async () => {
                    await removeTrackedCreator(fd);
                  });
                }}
              >
                <Button type="submit" variant="ghost" size="sm">
                  ×
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
