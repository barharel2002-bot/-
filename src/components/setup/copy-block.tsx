'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';
import { useAutoClear } from '@/hooks/use-auto-clear';

// בלוק טקסט עם כפתור העתק — עבור SQL, .env.local, פקודות bash
type Props = {
  text: string;
  label?: string;
  language?: 'sql' | 'env' | 'bash';
};

export function CopyBlock({ text, label, language = 'env' }: Props) {
  const t = useTranslations('setup.wizard');
  const [copied, setCopied] = useState(false);
  useAutoClear(copied, () => setCopied(false), 1800);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background/60">
      <div className="flex items-center justify-between border-b border-border bg-card/40 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label ?? language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">{t('copied')}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>{t('copyEnv')}</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed" dir="ltr">
        <code className="font-mono">{text}</code>
      </pre>
    </div>
  );
}
