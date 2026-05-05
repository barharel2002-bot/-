'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, Copy, Check, ThumbsDown, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { generateCopyAction, saveAIFeedback } from '@/lib/ai/actions';
import { useAutoClear } from '@/hooks/use-auto-clear';
import type { CopyOutput } from '@/lib/ai/copy';
import type { Locale } from '@/i18n/routing';

type Props = {
  initialBudgetPercent: number;
  budgetBlocked: boolean;
};

export function CopyForm({ initialBudgetPercent, budgetBlocked }: Props) {
  const t = useTranslations('copy');
  const locale = useLocale() as Locale;
  const [idea, setIdea] = useState('');
  const [output, setOutput] = useState<CopyOutput | null>(null);
  const [budgetPercent, setBudgetPercent] = useState(initialBudgetPercent);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(budgetBlocked);
  const [isPending, startTransition] = useTransition();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!idea.trim() || isBlocked) return;
    setErrorKey(null);
    startTransition(async () => {
      const result = await generateCopyAction(idea, locale);
      if (!result.ok) {
        if (result.error === 'budget_blocked') {
          setIsBlocked(true);
          setBudgetPercent(1);
        }
        setErrorKey(result.error ?? 'failed');
        return;
      }
      setOutput(result.output!);
      if (result.budgetPercent !== undefined) {
        setBudgetPercent(result.budgetPercent);
      }
    });
  }

  // אם חסום — מסך ייעודי
  if (isBlocked) {
    return (
      <Card className="space-y-4 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-creator-gradient-soft">
          <Sparkles className="h-6 w-6 text-creator-orange" />
        </div>
        <h2 className="text-xl font-semibold">{t('blockedTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('blockedSubtitle')}</p>
      </Card>
    );
  }

  const showWarning = budgetPercent >= 0.8 && budgetPercent < 1;

  return (
    <div className="space-y-6">
      {showWarning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          {t('warningBanner', { percent: Math.round(budgetPercent * 100) })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Label htmlFor="idea">{t('ideaLabel')}</Label>
        <Textarea
          id="idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={t('ideaPlaceholder')}
          className="min-h-32"
          required
        />
        <div className="flex justify-end gap-2">
          {output && (
            <Button
              type="submit"
              variant="outline"
              disabled={isPending || !idea.trim()}
            >
              <RefreshCw className="h-4 w-4" />
              {t('regenerate')}
            </Button>
          )}
          {!output && (
            <Button type="submit" disabled={isPending || !idea.trim()}>
              <Sparkles className="h-4 w-4" />
              {isPending ? t('generating') : t('generate')}
            </Button>
          )}
        </div>
      </form>

      {errorKey === 'failed' && (
        <p className="text-sm text-red-400">⚠ {errorKey}</p>
      )}

      {output && (
        <div className="space-y-4 animate-fade-in">
          <OutputCard label={t('caption')} text={output.caption} />
          <HooksCard label={t('hooks')} hooks={output.hooks} />
          <HashtagsCard label={t('hashtags')} hashtags={output.hashtags} />

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFeedbackOpen(true)}
            >
              <ThumbsDown className="h-4 w-4" />
              {t('notAFit')}
            </Button>
          </div>

          <FeedbackDialog
            open={feedbackOpen}
            onClose={() => setFeedbackOpen(false)}
            originalOutput={JSON.stringify(output, null, 2)}
          />
        </div>
      )}
    </div>
  );
}

// ===== כרטיסי פלט =====

function OutputCard({ label, text }: { label: string; text: string }) {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        <CopyButton text={text} />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </Card>
  );
}

function HooksCard({ label, hooks }: { label: string; hooks: string[] }) {
  return (
    <Card className="space-y-3 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <ul className="space-y-2">
        {hooks.map((hook, i) => (
          <li
            key={i}
            className="group flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
          >
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-creator-gradient-soft text-[10px] font-bold text-creator-purple">
              {i + 1}
            </span>
            <span className="flex-1 text-sm leading-relaxed">{hook}</span>
            <CopyButton text={hook} small />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function HashtagsCard({
  label,
  hashtags,
}: {
  label: string;
  hashtags: string[];
}) {
  const joined = hashtags.map((h) => `#${h}`).join(' ');
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        <CopyButton text={joined} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {hashtags.map((h) => (
          <span
            key={h}
            className="rounded-full bg-creator-gradient-soft px-2.5 py-1 text-xs text-creator-purple"
          >
            #{h}
          </span>
        ))}
      </div>
    </Card>
  );
}

function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const t = useTranslations('copy');
  const [copied, setCopied] = useState(false);
  useAutoClear(copied, () => setCopied(false), 1800);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        'inline-flex items-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground ' +
        (small ? 'px-1.5 py-1' : 'px-2 py-1')
      }
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{t('copied')}</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>{t('copy')}</span>
        </>
      )}
    </button>
  );
}

function FeedbackDialog({
  open,
  onClose,
  originalOutput,
}: {
  open: boolean;
  onClose: () => void;
  originalOutput: string;
}) {
  const t = useTranslations('copy');
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  useAutoClear(
    saved,
    () => {
      setSaved(false);
      setText('');
      onClose();
    },
    1500
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    startTransition(async () => {
      const r = await saveAIFeedback('copy', text, originalOutput);
      if (r.ok) setSaved(true);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('feedbackTitle')}</DialogTitle>
          <DialogDescription>{t('feedbackSubtitle')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('feedbackPlaceholder')}
            autoFocus
            className="min-h-28"
            required
          />
          {saved ? (
            <p className="text-sm text-emerald-400">{t('feedbackSaved')}</p>
          ) : (
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending || !text.trim()}>
                {t('submitFeedback')}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
