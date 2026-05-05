'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Star, Play, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  saveLearnVideo,
  toggleVideoUseful,
  unsaveLearnVideo,
  markVideoWatched,
} from '@/lib/learn/actions';
import { formatDuration, type YouTubeVideo } from '@/lib/youtube/search';
import type { LearnCategory } from '@/config/creators.config';

type Props = {
  video: YouTubeVideo;
  category: LearnCategory;
  initialSaved: boolean;
  initialUseful: boolean;
};

export function VideoCard({
  video,
  category,
  initialSaved,
  initialUseful,
}: Props) {
  const t = useTranslations('learn');
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  const [useful, setUseful] = useState(initialUseful);
  const [isPending, startTransition] = useTransition();

  const meta = {
    videoId: video.id,
    title: video.title,
    channelName: video.channelTitle,
    thumbnailUrl: video.thumbnail,
    category,
  };

  function handleOpen() {
    setOpen(true);
    // סימון אוטומטי כצפיתי
    startTransition(async () => {
      await markVideoWatched(meta);
      setSaved(true);
    });
  }

  function handleToggleSave(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      if (saved) {
        const r = await unsaveLearnVideo(video.id);
        if (r.ok) {
          setSaved(false);
          setUseful(false);
        }
      } else {
        const r = await saveLearnVideo(meta);
        if (r.ok) setSaved(true);
      }
    });
  }

  function handleToggleUseful(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !useful;
    startTransition(async () => {
      const r = await toggleVideoUseful({ ...meta, isUseful: next });
      if (r.ok) {
        setUseful(next);
        setSaved(true);
      }
    });
  }

  return (
    <>
      <Card
        className="group cursor-pointer overflow-hidden p-0 transition-all hover:border-creator-purple/40"
        onClick={handleOpen}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted">
          {video.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail}
              alt={video.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-creator-gradient opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              <Play className="h-5 w-5 text-white" fill="white" strokeWidth={0} />
            </div>
          </div>
          {/* Duration */}
          {video.duration && (
            <span className="absolute bottom-2 end-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-mono text-white">
              {formatDuration(video.durationSeconds)}
            </span>
          )}
          {/* Short badge */}
          {video.isShort && (
            <span className="absolute top-2 start-2 rounded-full bg-creator-gradient px-2 py-0.5 text-[10px] font-bold text-white">
              SHORT
            </span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 p-3">
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {video.title}
          </p>
          <p className="text-xs text-muted-foreground">{video.channelTitle}</p>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleToggleSave}
              disabled={isPending}
              className={cn(
                'rounded-md px-2 py-1 text-xs transition-colors',
                saved
                  ? 'bg-creator-gradient-soft text-creator-purple'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              )}
              title={saved ? t('saved') : t('save')}
            >
              {saved ? '★ ' + t('saved') : '☆ ' + t('save')}
            </button>
            <button
              type="button"
              onClick={handleToggleUseful}
              disabled={isPending}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                useful
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={useful ? t('markedUseful') : t('markUseful')}
            >
              <Star
                className="h-3 w-3"
                fill={useful ? 'currentColor' : 'none'}
                strokeWidth={2}
              />
              {useful ? t('markedUseful') : t('markUseful')}
            </button>
          </div>
        </div>
      </Card>

      {/* Embedded player modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[90vw] max-w-3xl p-0">
          <DialogTitle className="sr-only">{video.title}</DialogTitle>
          <div className="aspect-video bg-black">
            {open && (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            )}
          </div>
          <div className="space-y-1 p-4">
            <p className="text-base font-medium">{video.title}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{video.channelTitle}</span>
              <a
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                {t('openOnYoutube')}
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
