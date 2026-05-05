'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BookOpen, Bookmark, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { VideoCard } from './video-card';
import type { YouTubeVideo } from '@/lib/youtube/search';
import type { SavedVideoRow } from '@/lib/learn/queries';
import type { LearnCategory } from '@/config/creators.config';
import { cn } from '@/lib/utils';

const CATEGORIES: LearnCategory[] = [
  'creating_content',
  'spotting_opportunities',
  'persistence',
  'on_camera_confidence',
  'social_strategy',
];

type Tab = LearnCategory | 'saved';

type Props = {
  initialCategory: LearnCategory;
  initialVideos: YouTubeVideo[];
  initialError: string | null;
  savedMap: Map<string, { is_useful: boolean; is_watched: boolean }>;
  savedList: SavedVideoRow[];
};

type Filter = 'all' | 'shorts' | 'long';

export function LearnPage({
  initialCategory,
  initialVideos,
  initialError,
  savedMap,
  savedList,
}: Props) {
  const t = useTranslations('learn');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialCategory);
  const [filter, setFilter] = useState<Filter>('all');
  const [, startTransition] = useTransition();

  // עבור טאב הקטגוריה הראשונית — initialVideos.
  // עבור שאר הטאבים — link אמיתי שגורם ניווט (page.tsx ירנדר את הקטגוריה החדשה)
  const isShowingSaved = activeTab === 'saved';

  const filteredInitialVideos = useMemo(() => {
    if (filter === 'all') return initialVideos;
    if (filter === 'shorts') return initialVideos.filter((v) => v.isShort);
    return initialVideos.filter((v) => !v.isShort);
  }, [initialVideos, filter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* כותרת */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-base text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* טאבים — קטגוריות + שמורים */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <CategoryTab
            key={cat}
            category={cat}
            active={activeTab === cat}
            onClick={() => {
              setActiveTab(cat);
              if (cat !== initialCategory) {
                startTransition(() => {
                  router.push(`?category=${cat}`);
                });
              }
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors',
            isShowingSaved
              ? 'bg-creator-gradient text-white'
              : 'border border-border text-muted-foreground hover:text-foreground'
          )}
        >
          <Bookmark className="h-3.5 w-3.5" />
          {t('tabs.saved')}
          {savedList.length > 0 && (
            <span className="ms-1 rounded-full bg-black/20 px-1.5 py-0 text-[10px]">
              {savedList.length}
            </span>
          )}
        </button>
      </div>

      {/* סינון Shorts/Long — רק במצב קטגוריה */}
      {!isShowingSaved && initialVideos.length > 0 && (
        <div className="flex gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            {t('filters.all')}
          </FilterChip>
          <FilterChip active={filter === 'shorts'} onClick={() => setFilter('shorts')}>
            {t('filters.shorts')}
          </FilterChip>
          <FilterChip active={filter === 'long'} onClick={() => setFilter('long')}>
            {t('filters.long')}
          </FilterChip>
        </div>
      )}

      {/* תוכן */}
      {!isShowingSaved ? (
        <CategoryView
          videos={filteredInitialVideos}
          category={initialCategory}
          savedMap={savedMap}
          error={initialError}
        />
      ) : (
        <SavedView savedList={savedList} />
      )}
    </div>
  );
}

function CategoryTab({
  category,
  active,
  onClick,
}: {
  category: LearnCategory;
  active: boolean;
  onClick: () => void;
}) {
  const t = useTranslations('learn.tabs');
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors',
        active
          ? 'bg-creator-gradient text-white'
          : 'border border-border text-muted-foreground hover:text-foreground'
      )}
    >
      {t(category as any)}
    </button>
  );
}

function FilterChip({
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
        'rounded-md px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-card text-foreground border border-creator-purple/40'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function CategoryView({
  videos,
  category,
  savedMap,
  error,
}: {
  videos: YouTubeVideo[];
  category: LearnCategory;
  savedMap: Map<string, { is_useful: boolean; is_watched: boolean }>;
  error: string | null;
}) {
  const t = useTranslations('learn');

  if (error) {
    return (
      <Card className="flex items-start gap-3 border-amber-500/30 p-5">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />
        <p className="text-sm text-amber-200">{t('errorApi')}</p>
      </Card>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <BookOpen className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => {
        const saved = savedMap.get(video.id);
        return (
          <VideoCard
            key={video.id}
            video={video}
            category={category}
            initialSaved={!!saved}
            initialUseful={saved?.is_useful ?? false}
          />
        );
      })}
    </div>
  );
}

function SavedView({ savedList }: { savedList: SavedVideoRow[] }) {
  const t = useTranslations('learn');

  if (savedList.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Bookmark className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('savedEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {savedList.map((row) => {
        // Convert SavedVideoRow → YouTubeVideo for VideoCard
        const stub = {
          id: row.video_id,
          title: row.title ?? '',
          channelTitle: row.channel_name ?? '',
          thumbnail: row.thumbnail_url ?? '',
          publishedAt: row.saved_at,
          duration: null,
          durationSeconds: 0,
          viewCount: null,
          isShort: false,
        };
        return (
          <VideoCard
            key={row.id}
            video={stub}
            category={(row.category ?? 'creating_content') as LearnCategory}
            initialSaved={true}
            initialUseful={row.is_useful}
          />
        );
      })}
    </div>
  );
}
