'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link as LinkIcon, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addLinkToQueue } from '@/lib/swipes/actions';
import { useAutoClear } from '@/hooks/use-auto-clear';
import type { SwipeCategory } from '@/types';

type Props = {
  category: SwipeCategory;
};

export function AddLinkForm({ category }: Props) {
  const t = useTranslations('swipes.addLink');
  const [url, setUrl] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useAutoClear(showSuccess, () => setShowSuccess(false), 1800);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url.trim()) return;
    setErrorKey(null);
    setShowSuccess(false);
    startTransition(async () => {
      const result = await addLinkToQueue(category, url.trim());
      if (result.ok) {
        setUrl('');
        setShowSuccess(true);
      } else {
        setErrorKey(
          result.error === 'duplicate'
            ? 'errorDuplicate'
            : result.error === 'invalid_url'
              ? 'errorInvalid'
              : 'errorFailed'
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('placeholder')}
            disabled={isPending}
            dir="ltr"
            className="ps-9"
          />
        </div>
        <Button type="submit" disabled={isPending || !url.trim()}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isPending ? t('fetching') : t('submit')}
          </span>
        </Button>
      </div>

      {errorKey && (
        <p className="text-sm text-red-400">{t(errorKey as any)}</p>
      )}
      {showSuccess && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t('added')}
        </p>
      )}
      {!errorKey && !showSuccess && (
        <p className="text-[11px] text-muted-foreground">{t('hint')}</p>
      )}
    </form>
  );
}
