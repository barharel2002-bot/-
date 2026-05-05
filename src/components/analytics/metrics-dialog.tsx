'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Save, CheckCircle2 } from 'lucide-react';
import { useAutoClear } from '@/hooks/use-auto-clear';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveMetrics } from '@/lib/analytics/actions';
import type { PostWithMetrics } from '@/lib/analytics/queries';

type Props = {
  post: PostWithMetrics;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MetricsDialog({ post, open, onOpenChange }: Props) {
  const t = useTranslations('analytics.form');
  const [views, setViews] = useState(post.metrics?.views ?? 0);
  const [likes, setLikes] = useState(post.metrics?.likes ?? 0);
  const [saves, setSavesNum] = useState(post.metrics?.saves ?? 0);
  const [shares, setShares] = useState(post.metrics?.shares ?? 0);
  const [comments, setComments] = useState(post.metrics?.comments ?? 0);
  const [watchTime, setWatchTime] = useState(post.metrics?.avgWatchTimeSec ?? 0);
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useAutoClear(
    savedConfirm,
    () => {
      setSavedConfirm(false);
      onOpenChange(false);
    },
    1200
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveMetrics({
        contentId: post.id,
        views,
        likes,
        saves,
        shares,
        comments,
        avgWatchTimeSec: watchTime > 0 ? watchTime : null,
      });
      if (r.ok) setSavedConfirm(true);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NumField
              id="views"
              label={t('views')}
              value={views}
              onChange={setViews}
            />
            <NumField
              id="likes"
              label={t('likes')}
              value={likes}
              onChange={setLikes}
            />
            <NumField
              id="saves"
              label={t('saves')}
              value={saves}
              onChange={setSavesNum}
            />
            <NumField
              id="shares"
              label={t('shares')}
              value={shares}
              onChange={setShares}
            />
            <NumField
              id="comments"
              label={t('comments')}
              value={comments}
              onChange={setComments}
            />
            <NumField
              id="watchTime"
              label={t('avgWatchTime')}
              value={watchTime}
              onChange={setWatchTime}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {savedConfirm && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {t('saved')}
              </span>
            )}
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4" />
              {t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NumField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        dir="ltr"
        className="text-end"
      />
    </div>
  );
}
