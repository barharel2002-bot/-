'use client';

import { useTranslations } from 'next-intl';
import { Lightbulb, ArrowDown } from 'lucide-react';

// מצב ריק — שאלות פתיחה איכותיות במקום מסך ריק
// משמש בשבוע הראשון לאיסוף בייסליין
type Props = {
  onUsePrompt: (prompt: string) => void;
};

const PROMPT_KEYS = ['p1', 'p2', 'p3'] as const;

export function EmptyState({ onUsePrompt }: Props) {
  const t = useTranslations('ideas.empty');

  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-creator-gradient-soft">
        <Lightbulb className="h-8 w-8 text-creator-purple" />
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
        <p className="text-base text-muted-foreground">{t('subtitle')}</p>
      </div>

      <ArrowDown className="h-4 w-4 text-creator-purple/50" />

      <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
        {PROMPT_KEYS.map((key) => {
          const text = t(`prompts.${key}`);
          return (
            <button
              key={key}
              onClick={() => onUsePrompt(text)}
              className="group rounded-xl border border-border bg-card p-4 text-start text-sm text-muted-foreground transition-all hover:border-creator-purple/40 hover:bg-card/80 hover:text-foreground"
            >
              <span className="text-creator-purple group-hover:text-creator-orange transition-colors">
                {key === 'p1' ? '?' : key === 'p2' ? '?' : '?'}
              </span>
              <p className="mt-1">{text}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
