'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Compass, Sparkles, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { FindNextOutput } from '@/lib/ai/find-next';

interface Props {
  defaultAudience: string;
  budgetBlocked: boolean;
  budgetPercent: number;
}

export function FindNextForm({ defaultAudience, budgetBlocked, budgetPercent }: Props) {
  const t = useTranslations('findNext');
  const tCopy = useTranslations('copy');
  const locale = useLocale() as 'he' | 'en';

  const [niche, setNiche] = useState('');
  const [audience, setAudience] = useState(defaultAudience);
  const [whatWorked, setWhatWorked] = useState('');
  const [whatBlocks, setWhatBlocks] = useState('');
  const [preferredFormat, setPreferredFormat] = useState<'short' | 'long' | 'both'>('both');

  const [result, setResult] = useState<FindNextOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/ai/find-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          audience,
          whatWorked,
          whatBlocks,
          preferredFormat,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'failed');
        return;
      }
      setResult(data.result as FindNextOutput);
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
    return <Result result={result} onReset={reset} />;
  }

  const showWarning = budgetPercent >= 0.8 && budgetPercent < 1;

  return (
    <form onSubmit={submit} className="space-y-5">
      {showWarning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          {tCopy('warningBanner', { percent: Math.round(budgetPercent * 100) })}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="niche">{t('q.niche.label')}</Label>
        <Input
          id="niche"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder={t('q.niche.placeholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience">{t('q.audience.label')}</Label>
        <Textarea
          id="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder={t('q.audience.placeholder')}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="worked">{t('q.worked.label')}</Label>
        <Textarea
          id="worked"
          value={whatWorked}
          onChange={(e) => setWhatWorked(e.target.value)}
          placeholder={t('q.worked.placeholder')}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="blocks">{t('q.blocks.label')}</Label>
        <Textarea
          id="blocks"
          value={whatBlocks}
          onChange={(e) => setWhatBlocks(e.target.value)}
          placeholder={t('q.blocks.placeholder')}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('q.format.label')}</Label>
        <div className="flex flex-wrap gap-2">
          {(['short', 'long', 'both'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setPreferredFormat(opt)}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                preferredFormat === opt
                  ? 'bg-violet-500/20 border-violet-400 text-violet-100'
                  : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
              }`}
            >
              {t(`q.format.options.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{t('error')}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        <Compass className="h-4 w-4" />
        {isPending ? t('thinking') : t('submit')}
      </Button>
    </form>
  );
}

function Result({ result, onReset }: { result: FindNextOutput; onReset: () => void }) {
  const t = useTranslations('findNext');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('result.title')}</h2>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {t('result.again')}
        </Button>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-creator-purple" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('result.summary')}
          </h3>
        </div>
        <p className="text-sm leading-relaxed">{result.summary}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {t('result.recommendedFormat')}: <span className="font-semibold text-foreground">{result.recommendedFormat}</span>
        </p>
      </Card>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {t('result.ideas')}
        </h3>
        <div className="space-y-3">
          {result.ideas.map((idea, i) => (
            <Card key={i} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-base font-semibold leading-snug">{idea.title}</h4>
                <span className="shrink-0 rounded-full bg-creator-gradient-soft px-2 py-0.5 text-xs text-creator-purple">
                  {idea.format}
                </span>
              </div>
              <p className="text-sm italic text-muted-foreground">
                <span className="text-creator-orange">{t('result.hookPrefix')}: </span>
                &ldquo;{idea.hook}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground">{idea.whyItFits}</p>
            </Card>
          ))}
        </div>
      </div>

      {result.generalTips?.length > 0 && (
        <Card className="space-y-2 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('result.tips')}
          </h3>
          <ul className="space-y-2">
            {result.generalTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-creator-purple" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
