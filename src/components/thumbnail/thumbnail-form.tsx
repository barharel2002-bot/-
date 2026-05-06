'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ThumbnailGeneratorOutput, ThumbnailConcept } from '@/lib/ai/thumbnail';

interface Props {
  budgetBlocked: boolean;
  budgetPercent: number;
}

export function ThumbnailForm({ budgetBlocked, budgetPercent }: Props) {
  const t = useTranslations('thumbnail');
  const tCopy = useTranslations('copy');
  const locale = useLocale() as 'he' | 'en';

  const [idea, setIdea] = useState('');
  const [result, setResult] = useState<ThumbnailGeneratorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/ai/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'failed');
        return;
      }
      setResult(data.result as ThumbnailGeneratorOutput);
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
    return <ThumbnailResult result={result} onReset={reset} />;
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
        <ImageIcon className="h-4 w-4" />
        {isPending ? t('generating') : t('generate')}
      </Button>
    </form>
  );
}

function ThumbnailResult({
  result,
  onReset,
}: {
  result: ThumbnailGeneratorOutput;
  onReset: () => void;
}) {
  const t = useTranslations('thumbnail');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('result.title')}</h2>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {t('result.again')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {result.concepts.map((concept, i) => (
          <ConceptCard key={i} concept={concept} index={i + 1} />
        ))}
      </div>
    </div>
  );
}

function ConceptCard({
  concept,
  index,
}: {
  concept: ThumbnailConcept;
  index: number;
}) {
  const t = useTranslations('thumbnail');
  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {t('result.concept')} {index}
        </div>
        <div className="text-base font-semibold text-creator-purple">
          {concept.patternLabel}
        </div>
      </div>

      {/* Visual mockup of the thumbnail — using the colors + text */}
      <ThumbnailPreview concept={concept} />

      <div className="space-y-2 text-sm">
        <Field label={t('result.textOverlay')} value={concept.textOverlay} bold />
        {concept.expression !== 'none' && (
          <Field label={t('result.expression')} value={concept.expression} />
        )}
        <Field label={t('result.composition')} value={concept.composition} />
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t('result.colors')}
          </p>
          <div className="mt-1 flex gap-1.5">
            {concept.colorPalette.map((color, i) => (
              <ColorChip key={i} color={color} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="text-creator-orange font-medium">{t('result.why')}: </span>
          {concept.reasoning}
        </p>
      </div>
    </Card>
  );
}

function ThumbnailPreview({ concept }: { concept: ThumbnailConcept }) {
  // 16:9 mockup using the first two colors
  const bg = colorToCss(concept.colorPalette[0]) ?? '#27272a';
  const accent = colorToCss(concept.colorPalette[1]) ?? '#fbbf24';
  return (
    <div
      className="aspect-video rounded-lg flex items-center justify-center text-center font-extrabold uppercase tracking-tight px-4"
      style={{
        background: `linear-gradient(135deg, ${bg} 0%, ${accent} 130%)`,
        color: '#fff',
        textShadow: '0 2px 12px rgba(0,0,0,0.4)',
      }}
    >
      <span className="text-2xl leading-tight line-clamp-2">
        {concept.textOverlay}
      </span>
    </div>
  );
}

function colorToCss(name: string | undefined): string | null {
  if (!name) return null;
  // Try CSS color name first; if it fails, fallback to a common palette mapping
  const map: Record<string, string> = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    black: '#0a0a0b',
    white: '#fafafa',
    gray: '#71717a',
    grey: '#71717a',
    cyan: '#06b6d4',
    teal: '#14b8a6',
    lime: '#84cc16',
    amber: '#f59e0b',
  };
  const lower = name.trim().toLowerCase();
  return map[lower] ?? name;
}

function Field({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={bold ? 'font-semibold' : ''}>{value}</p>
    </div>
  );
}

function ColorChip({ color }: { color: string }) {
  const css = colorToCss(color) ?? '#71717a';
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[11px]">
      <span
        className="inline-block h-3 w-3 rounded-full border border-border"
        style={{ background: css }}
      />
      <span>{color}</span>
    </span>
  );
}
