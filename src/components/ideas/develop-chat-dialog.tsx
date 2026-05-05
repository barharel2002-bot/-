'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, Send, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

const MAX_MESSAGES = 30;

interface ChatMessage {
  id: string; // local id (timestamp) או DB id
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean; // true בזמן streaming
}

type Props = {
  ideaId: string;
  ideaContent: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DevelopChatDialog({
  ideaId,
  ideaContent,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations('ideas.develop');
  const locale = useLocale() as Locale;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<'budget' | 'failed' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // טוען היסטוריה כשהדיאלוג נפתח. אם אין — מתחיל שיחה חדשה אוטומטית
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput('');
      setError(null);
      setLoaded(false);
      abortRef.current?.abort();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ai/develop/history?ideaId=${ideaId}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setMessages(
            (data.messages ?? []).map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            }))
          );
          setLoaded(true);
          // אם אין הודעות — נתחיל אוטומטית עם first message מה-AI
          if (!data.messages || data.messages.length === 0) {
            void streamReply(null);
          }
        } else {
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ideaId]);

  // גלול אוטומטית לתחתית בכל עדכון
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // פונקציה ראשית — שולחת הודעה ומקבלת תגובה זורמת
  const streamReply = useCallback(
    async (userMessage: string | null) => {
      setError(null);
      setIsStreaming(true);

      // מקומי: אם זו הודעת user — הוסף אותה אופטימיסטית
      if (userMessage !== null) {
        setMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: 'user', content: userMessage },
        ]);
      }

      // הוסף הודעת assistant ריקה שתתמלא בזמן streaming
      const assistantId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', pending: true },
      ]);

      // AbortController — לעצור אם המשתמש סוגר את הדיאלוג
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/ai/develop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideaId, userMessage, locale }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error === 'budget_blocked') {
            setError('budget');
          } else if (data.error === 'limit_reached') {
            setError('failed');
          } else {
            setError('failed');
          }
          // הסר את ההודעה הריקה
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }

        if (!res.body) {
          setError('failed');
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }

        // קריאה זורמת
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          // עדכן את ההודעה האחרונה ב-state
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        }

        // סיים pending
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, pending: false } : m
          )
        );
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('[chat] stream failed', err);
        setError('failed');
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
      }
    },
    [ideaId, locale]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const message = input.trim();
    setInput('');
    void streamReply(message);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl+Enter שולח (כמו בכל אפליקציית chat מודרנית)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  const reachedLimit = messages.length >= MAX_MESSAGES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-h-[700px] max-w-2xl flex-col p-0">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-creator-purple" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
          {/* Idea pin */}
          <div className="mt-3 rounded-lg border border-border bg-card/50 p-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('ideaPin')}
            </p>
            <p className="line-clamp-3 text-sm leading-relaxed">{ideaContent}</p>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {!loaded && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {loaded && messages.length === 0 && !isStreaming && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('emptyHint')}
            </p>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} thinkingLabel={t('thinking')} />
          ))}

          {error === 'budget' && (
            <ErrorBanner text={t('errorBudget')} />
          )}
          {error === 'failed' && (
            <ErrorBanner text={t('errorFailed')} />
          )}

          {reachedLimit && (
            <p className="rounded-lg border border-border bg-card/50 p-3 text-center text-xs text-muted-foreground">
              {t('messagesLimit')}
            </p>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border px-6 pb-6 pt-3"
        >
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder')}
              disabled={isStreaming || reachedLimit}
              rows={2}
              className="min-h-12 flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isStreaming || reachedLimit}
              className="self-end"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isStreaming ? t('sending') : t('send')}
              </span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MessageBubble({
  message,
  thinkingLabel,
}: {
  message: ChatMessage;
  thinkingLabel: string;
}) {
  const isUser = message.role === 'user';
  const showThinking = message.pending && !message.content;

  return (
    <div
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-creator-gradient text-white'
            : 'border border-border bg-card text-foreground'
        )}
      >
        {showThinking ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {thinkingLabel}
          </span>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}
