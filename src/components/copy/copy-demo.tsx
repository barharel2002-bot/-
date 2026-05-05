'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAutoClear } from '@/hooks/use-auto-clear';
import type { CopyOutput } from '@/lib/ai/copy';

// תצוגת הדגמה של פלט הסוכן — ללא טופס פעיל, ללא קריאה ל-API
type Props = {
  ideaText: string;
  output: CopyOutput;
};

export function CopyDemo({ ideaText, output }: Props) {
  const t = useTranslations('copy');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {t('ideaLabel')}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {ideaText}
        </p>
      </div>

      <div className="space-y-4 animate-fade-in">
        <OutputCard label={t('caption')} text={output.caption} />
        <HooksCard label={t('hooks')} hooks={output.hooks} />
        <HashtagsCard label={t('hashtags')} hashtags={output.hashtags} />
      </div>
    </div>
  );
}

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
