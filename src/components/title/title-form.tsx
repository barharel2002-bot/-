'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Sparkles,
  RotateCcw,
  Copy as CopyIcon,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { TitleGeneratorOutput, TitleVariation } from '@/lib/ai/title';

interface Props {
  budgetBlocked: boolean;
  budgetPercent: number;
}

export function TitleForm({ budgetBlocked, budgetPercent }: Props) {
  const t = useTranslations('title');
  const tCopy = useTranslations('copy');
  const locale = useLocale() as 'he' | 'en';

  const [idea, setIdea] = useState('');
  const [result, setResult] = useState<TitleGeneratorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/ai/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'failed');
        return;
      }
      setResult(data.result as TitleGeneratorOutput);
    });
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  if (budgetBlocked) {
    return (
      <Card className="space-y-4 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-creator-gradient-soft">
          <Sparkles className="h-6 w-6 text-creator-orange" />
        </div>
        <h2 className="text-xl font-semibold">{tCopy('blockedTitle')}</h2>
        <p className="text-sm text-muted-foreground">{tCopy('blockedSubtitle')}</p>
      </Card>
    );
  }

  if (result) {
    return <TitleResult result={result} onReset={reset} />;
  }

  const showWarning = budgetPercent >= 0.8 && budgetPercent < 1;

  return (
    <form onSubmit={submit} className="space-y-4">
      {showWarning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          {tCopy('warningBanner', { percent: Math.round(budgetPercent * 100) })}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="idea">{t('ideaLabel')}</Label>
        <Textarea
          id="idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={t('ideaPlaceholder')}
          rows={4}
          required
        />
      </div>

      {error && <p className="text-sm text-red-400">{t('error')}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        <Sparkles className="h-4 w-4" />
        {isPending ? t('generating') : t('generate')}
      </Button>
    </form>
  );
}

function TitleResult({
  result,
  onReset,
}: {
  result: TitleGeneratorOutput;
  onReset: () => void;
}) {
  const t = useTranslations('title');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('result.title')}</h2>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {t('result.again')}
        </Button>
      </div>

      <div className="space-y-3">
        {result.titles.map((title, i) => (
          <TitleCard key={i} title={title} index={i + 1} />
        ))}
      </div>
    </div>
  );
}

function TitleCard({ title, index }: { title: TitleVariation; index: number }) {
  const t = useTranslations('title');
  const [copied, setCopied] = useState(false);

  function copyTitle() {
    navigator.clipboard.writeText(title.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Length scoring: 50-65 chars = optimal (green), <50 or 66-80 = ok (amber), >80 = poor (red)
  const lengthTone =
    title.length >= 50 && title.length <= 65
      ? 'good'
      : title.length <= 80
        ? 'mid'
        : 'bad';
  const lengthClass =
    lengthTone === 'good'
      ? 'text-emerald-400'
      : lengthTone === 'mid'
        ? 'text-amber-400'
        : 'text-red-400';

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-creator-gradient-soft px-2 py-0.5 text-creator-purple font-medium">
              {t(`angles.${title.angle}`)}
            </span>
            <span className={`font-mono ${lengthClass}`}>
              {title.length}/65
            </span>
          </div>
          <p className="text-base font-semibold leading-snug">{title.text}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={copyTitle} className="shrink-0">
          {copied ? <Check className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{title.reasoning}</p>
      {title.seoKeywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {title.seoKeywords.map((kw, i) => (
            <span key={i} className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
              {kw}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
