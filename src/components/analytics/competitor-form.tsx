'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackYouTubeChannel } from '@/lib/channels/tracked';

export function CompetitorForm() {
  const t = useTranslations('analytics.competitor');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await trackYouTubeChannel(value.trim());
      if (res.ok) {
        setValue('');
      } else if (res.error === 'not_found') {
        setError(t('errorNotFound'));
      } else if (res.error === 'invalid_input' || res.error === 'empty') {
        setError(t('errorInvalid'));
      } else {
        setError(t('errorFailed'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-xs font-medium text-muted-foreground">
        {t('addLabel')}
      </label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('addPlaceholder')}
          className="flex-1"
          disabled={isPending}
        />
        <Button
          type="submit"
          disabled={isPending || !value.trim()}
          className="bg-creator-gradient text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {isPending ? t('adding') : t('addButton')}
          </span>
        </Button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </form>
  );
}
