'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { IdeaTag } from '@/types';

// מפת צבעים לתגיות — שומרת על עקביות ויזואלית בכל האפליקציה
const TAG_STYLES: Record<IdeaTag, { bg: string; text: string }> = {
  story: { bg: 'bg-pink-500/15', text: 'text-pink-300' },
  reel: { bg: 'bg-purple-500/15', text: 'text-purple-300' },
  tiktok: { bg: 'bg-cyan-500/15', text: 'text-cyan-300' },
  spontaneous: { bg: 'bg-amber-500/15', text: 'text-amber-300' },
  develop: { bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  post: { bg: 'bg-blue-500/15', text: 'text-blue-300' },
};

type Props = {
  tag: IdeaTag;
  active?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
};

export function TagChip({ tag, active, onClick, size = 'sm' }: Props) {
  const t = useTranslations('ideas.tags');
  const style = TAG_STYLES[tag];
  const isInteractive = !!onClick;

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <button
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      disabled={!isInteractive}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-all',
        sizeClasses,
        style.bg,
        style.text,
        isInteractive && 'cursor-pointer hover:scale-105',
        active && 'ring-2 ring-offset-2 ring-offset-background ring-creator-purple',
        !isInteractive && 'cursor-default'
      )}
    >
      {t(tag)}
    </button>
  );
}
