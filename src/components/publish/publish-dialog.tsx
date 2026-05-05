'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Send, CheckCircle2 } from 'lucide-react';
import { useAutoClear } from '@/hooks/use-auto-clear';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { markPublished } from '@/lib/publish/actions';
import { cn } from '@/lib/utils';
import type { ContentType, Tone } from '@/types';

const TYPES: ContentType[] = [
  'story',
  'short_video',
  'long_video',
  'post',
  'carousel',
];
const PLATFORMS = ['instagram', 'tiktok', 'both'] as const;
const TONES: Tone[] = ['inspirational', 'educational', 'personal', 'funny', 'value'];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ideaId: string | null;
  ideaPreview?: string;
};

export function PublishDialog({
  open,
  onOpenChange,
  ideaId,
  ideaPreview,
}: Props) {
  const t = useTranslations('publish');
  const tMirror = useTranslations('mirror');

  const [contentType, setContentType] = useState<ContentType>('post');
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'both'>(
    'instagram'
  );
  const [tone, setTone] = useState<Tone | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // אחרי שמירה מוצלחת — סוגר אוטומטית עם cleanup ב-unmount
  useAutoClear(
    saved,
    () => {
      setSaved(false);
      onOpenChange(false);
      setContentType('post');
      setPlatform('instagram');
      setTone(null);
    },
    1500
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const r = await markPublished({
        ideaId,
        contentType,
        platform,
        tone,
        title: ideaPreview ?? null,
      });
      if (r.ok) setSaved(true);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* סוג תוכן */}
          <div className="space-y-2">
            <Label>{t('typeLabel')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((tp) => (
                <ChipButton
                  key={tp}
                  active={contentType === tp}
                  onClick={() => setContentType(tp)}
                >
                  {tMirror(`contentTypes.${tp}` as any)}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* פלטפורמה */}
          <div className="space-y-2">
            <Label>{t('platformLabel')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <ChipButton
                  key={p}
                  active={platform === p}
                  onClick={() => setPlatform(p)}
                >
                  {t(`platforms.${p}`)}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* טון (אופציונלי) */}
          <div className="space-y-2">
            <Label>{t('toneLabel')}</Label>
            <div className="flex flex-wrap gap-1.5">
              <ChipButton active={tone === null} onClick={() => setTone(null)}>
                {t('skipTone')}
              </ChipButton>
              {TONES.map((tn) => (
                <ChipButton
                  key={tn}
                  active={tone === tn}
                  onClick={() => setTone(tn)}
                >
                  {tMirror(`tones.${tn}` as any)}
                </ChipButton>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {t('saved')}
              </span>
            )}
            <Button type="submit" disabled={isPending}>
              <Send className="h-4 w-4" />
              {t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-creator-gradient text-white'
          : 'border border-border text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
