'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { toggleShortsCategory } from '@/lib/swipes/categories';
import type { ShortsCategoryConfig } from '@/types';

interface Props {
  categories: ShortsCategoryConfig[];
  active: string[];
}

// פנל קטגוריות — toggle להפעלה/השבתה לכל קטגוריה
export function CategoriesPanel({ categories, active }: Props) {
  const locale = useLocale() as 'he' | 'en';
  const [, start] = useTransition();
  const set = new Set(active);

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const on = set.has(c.id);
        return (
          <form
            key={c.id}
            action={(fd) => {
              fd.set('category_id', c.id);
              fd.set('action', on ? 'remove' : 'add');
              start(async () => {
                await toggleShortsCategory(fd);
              });
            }}
          >
            <button
              type="submit"
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                on
                  ? 'bg-violet-500/20 border-violet-400 text-violet-100'
                  : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {c.label[locale]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
