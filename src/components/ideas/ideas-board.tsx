'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TagChip } from './tag-chip';
import { IdeaCard } from './idea-card';
import { EmptyState } from './empty-state';
import { useQuickCapture } from '@/components/quick-capture/quick-capture-provider';
import type { IdeaRow } from '@/lib/ideas/queries';
import type { IdeaTag } from '@/types';

const ALL_TAGS: IdeaTag[] = ['story', 'reel', 'tiktok', 'spontaneous', 'develop', 'post'];

type Props = {
  ideas: IdeaRow[];
};

export function IdeasBoard({ ideas }: Props) {
  const t = useTranslations('ideas');
  const quickCapture = useQuickCapture();

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<IdeaTag | null>(null);

  const filtered = useMemo(() => {
    return ideas.filter((idea) => {
      if (activeTag && !idea.tags.includes(activeTag)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!idea.content.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ideas, search, activeTag]);

  const isEmpty = ideas.length === 0;
  const noResults = !isEmpty && filtered.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <Button onClick={() => quickCapture.open()}>
          <Plus className="h-4 w-4" />
          {t('addNew')}
        </Button>
      </div>

      {!isEmpty && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={
                'rounded-full px-3 py-1 text-xs font-medium transition-colors ' +
                (activeTag === null
                  ? 'bg-creator-gradient text-white'
                  : 'border border-border text-muted-foreground hover:text-foreground')
              }
            >
              {t('all')}
            </button>
            {ALL_TAGS.map((tag) => (
              <TagChip
                key={tag}
                tag={tag}
                active={activeTag === tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {isEmpty ? (
        <EmptyState
          onUsePrompt={(prompt) => quickCapture.open({ seed: prompt })}
        />
      ) : noResults ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-muted-foreground">{t('noResults')}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setActiveTag(null);
            }}
          >
            {t('all')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
