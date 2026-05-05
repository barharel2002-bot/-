'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setYouTubeChannel } from '@/lib/profile/youtube';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  variant?: 'inline' | 'settings';
  onSaved?: () => void;
}

// רכיב משותף — להגדרות וכל empty-state ב-Mirror/Analytics/Swipe
export function YouTubeChannelInput({ variant = 'inline', onSaved }: Props) {
  const t = useTranslations('youtube');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await setYouTubeChannel(formData);
      if (!res.ok) setError(res.error);
      else onSaved?.();
    });
  }

  return (
    <form action={action} className="flex flex-col gap-2 max-w-md">
      <label className="text-sm text-muted-foreground">
        {variant === 'inline' ? t('inline_prompt') : t('settings_label')}
      </label>
      <div className="flex gap-2">
        <Input
          name="youtube_url"
          type="url"
          placeholder="https://youtube.com/@your-handle"
          required
          disabled={pending}
        />
        <Button type="submit" disabled={pending}>
          {pending ? t('saving') : t('save')}
        </Button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
