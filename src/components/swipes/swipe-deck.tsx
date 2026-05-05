'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
  X,
  Heart,
  Undo2,
  ExternalLink,
  ImageOff,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { decideSwipe, undoSwipe } from '@/lib/swipes/actions';
import type { SwipeItemRow } from '@/lib/swipes/queries';
import type { SwipeDecision } from '@/types';

const SWIPE_THRESHOLD = 100;

type Props = {
  initialQueue: SwipeItemRow[];
};

export function SwipeDeck({ initialQueue }: Props) {
  const t = useTranslations('swipes');
  const [queue, setQueue] = useState(initialQueue);
  const [lastDecided, setLastDecided] = useState<{
    item: SwipeItemRow;
    decision: SwipeDecision;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const top = queue[0];
  const next = queue[1];

  // החלטה — אופטימיסטי: מסיר מה-queue מיד, שולח ל-DB ברקע
  function decide(decision: 'liked' | 'skipped') {
    if (!top) return;
    const item = top;
    setQueue((prev) => prev.slice(1));
    setLastDecided({ item, decision });
    startTransition(async () => {
      await decideSwipe(item.id, decision);
    });
  }

  function undo() {
    if (!lastDecided) return;
    const { item } = lastDecided;
    setQueue((prev) => [item, ...prev]);
    setLastDecided(null);
    startTransition(async () => {
      await undoSwipe(item.id);
    });
  }

  // קיצורי מקלדת
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Avoid hijacking when typing in input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') decide('liked');
      else if (e.key === 'ArrowLeft') decide('skipped');
      else if (e.key === 'z' && lastDecided) undo();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [top, lastDecided]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!top) {
    return <EmptyQueue lastDecided={lastDecided} onUndo={undo} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {t('queue.remaining', { count: queue.length })}
        </span>
        {lastDecided && (
          <Button variant="ghost" size="sm" onClick={undo} disabled={isPending}>
            <Undo2 className="h-4 w-4" />
            {t('actions.undo')}
          </Button>
        )}
      </div>

      <div className="relative mx-auto h-[480px] w-full max-w-md">
        {/* קלף הבא — מאחורי הנוכחי */}
        {next && (
          <Card className="absolute inset-0 scale-95 opacity-50 blur-[1px]">
            <CardContent item={next} />
          </Card>
        )}

        {/* קלף נוכחי — דחוס בתוך AnimatePresence ל-exit smooth */}
        <AnimatePresence mode="wait">
          <DraggableCard
            key={top.id}
            item={top}
            onDecide={decide}
          />
        </AnimatePresence>
      </div>

      {/* כפתורי פעולה */}
      <div className="mx-auto flex max-w-md justify-between gap-3 px-4">
        <ActionButton
          onClick={() => decide('skipped')}
          variant="skip"
          label={t('actions.skip')}
        />
        <ActionButton
          onClick={() => decide('liked')}
          variant="like"
          label={t('actions.like')}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">{t('tip')}</p>
    </div>
  );
}

// =====================
// Draggable card
// =====================
function DraggableCard({
  item,
  onDecide,
}: {
  item: SwipeItemRow;
  onDecide: (decision: 'liked' | 'skipped') => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const likeOpacity = useTransform(x, [40, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-120, -40], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) onDecide('liked');
        else if (info.offset.x < -SWIPE_THRESHOLD) onDecide('skipped');
      }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: x.get() > 0 ? 600 : x.get() < 0 ? -600 : 0,
        opacity: 0,
        transition: { duration: 0.25 },
      }}
    >
      <Card className="relative h-full overflow-hidden">
        <CardContent item={item} />

        {/* תוויות החלטה — מופיעות עם הגרירה */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="pointer-events-none absolute end-6 top-6 rounded-lg border-2 border-emerald-400 bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-300"
        >
          ♥
        </motion.div>
        <motion.div
          style={{ opacity: skipOpacity }}
          className="pointer-events-none absolute start-6 top-6 rounded-lg border-2 border-red-400 bg-red-400/10 px-3 py-1 text-sm font-bold text-red-300"
        >
          ✕
        </motion.div>
      </Card>
    </motion.div>
  );
}

// Detect the display platform from the source URL. The DB column is
// constrained to instagram/tiktok/other, so YouTube items are stored as
// 'other'. We infer the real platform at render time so the badge shows
// correctly without a schema migration.
function inferPlatform(url: string): 'youtube' | 'tiktok' | 'instagram' | 'other' {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
  return 'other';
}

function isYouTubeShort(url: string): boolean {
  return url.toLowerCase().includes('/shorts/');
}

// =====================
// Card visual content
// =====================
function CardContent({ item }: { item: SwipeItemRow }) {
  const t = useTranslations('swipes.platforms');
  const tMirror = useTranslations('mirror');
  const displayPlatform = inferPlatform(item.source_url);
  const showShortBadge = displayPlatform === 'youtube' && isYouTubeShort(item.source_url);

  return (
    <div className="flex h-full flex-col">
      {/* תמונה */}
      <div className="relative flex-1 bg-muted">
        {item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail_url}
            alt={item.title ?? 'thumbnail'}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        <span className="absolute end-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {t(displayPlatform as any)}
          {showShortBadge && (
            <span className="ms-1 rounded bg-red-500/80 px-1 text-[9px]">
              {tMirror('shortLabel')}
            </span>
          )}
        </span>
      </div>

      {/* טקסט */}
      <div className="space-y-2 p-4">
        {item.title && (
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {item.title}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {item.author_name && <span>{item.author_name}</span>}
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            <span className="ms-auto">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// =====================
// Action buttons
// =====================
function ActionButton({
  onClick,
  variant,
  label,
}: {
  onClick: () => void;
  variant: 'skip' | 'like';
  label: string;
}) {
  const isLike = variant === 'like';
  const Icon = isLike ? Heart : X;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={
        'group flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all hover:scale-105 active:scale-95 ' +
        (isLike
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20'
          : 'border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-400 hover:bg-red-500/20')
      }
    >
      <Icon
        className="h-6 w-6"
        strokeWidth={2.5}
        fill={isLike ? 'currentColor' : 'none'}
      />
    </button>
  );
}

// =====================
// Empty queue state
// =====================
function EmptyQueue({
  lastDecided,
  onUndo,
}: {
  lastDecided: { item: SwipeItemRow; decision: SwipeDecision } | null;
  onUndo: () => void;
}) {
  const t = useTranslations('swipes');
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-creator-gradient-soft">
        <Sparkles className="h-7 w-7 text-creator-purple" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t('queue.empty')}</h3>
        <p className="text-sm text-muted-foreground">{t('queue.emptyHint')}</p>
      </div>
      {lastDecided && (
        <Button variant="outline" size="sm" onClick={onUndo}>
          <Undo2 className="h-4 w-4" />
          {t('actions.undo')}
        </Button>
      )}
    </div>
  );
}
