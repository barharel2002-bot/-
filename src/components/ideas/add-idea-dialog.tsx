'use client';

import { useState, useTransition, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Save, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TagChip } from './tag-chip';
import { VoiceRecorder } from './voice-recorder';
import { ImageAttachment } from './image-attachment';
import { createIdea } from '@/lib/ideas/actions';
import { addPendingIdea } from '@/lib/offline/idb';
import { useAutoClear } from '@/hooks/use-auto-clear';
import type { IdeaTag } from '@/types';

const ALL_TAGS: IdeaTag[] = ['story', 'reel', 'tiktok', 'spontaneous', 'develop', 'post'];

type Props = {
  // אם true — הדיאלוג נפתח אוטומטית בטעינה (מ-FAB עם ?new=1)
  defaultOpen?: boolean;
  // טריגר חיצוני אופציונלי (אם לא — נציג כפתור ברירת מחדל)
  trigger?: React.ReactNode;
  // האם OpenAI Whisper מוגדר (לתמלול קולי)
  whisperEnabled?: boolean;
  // === מצב controlled (משמש את ה-QuickCaptureProvider) ===
  controlled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  seedContent?: string | null;
};

export function AddIdeaDialog({
  defaultOpen = false,
  trigger,
  whisperEnabled = false,
  controlled = false,
  open: openProp,
  onOpenChange,
  seedContent,
}: Props) {
  const t = useTranslations('ideas');
  const tOffline = useTranslations('offline');
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<Set<IdeaTag>>(new Set());
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [queuedNote, setQueuedNote] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  // controlled vs uncontrolled — מקור האמת אחיד
  const isOpen = controlled ? !!openProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (controlled) onOpenChange?.(next);
    else setInternalOpen(next);
  };

  // סנכרון אם defaultOpen משתנה (uncontrolled מצב — ?new=1)
  useEffect(() => {
    if (!controlled && defaultOpen) setInternalOpen(true);
  }, [defaultOpen, controlled]);

  // כשפותחים את הדיאלוג עם seed — מאתחל את הטקסט (פעם אחת בעת פתיחה)
  useEffect(() => {
    if (!isOpen) return;
    if (seedContent) {
      // פותח את הדיאלוג עם תוכן זרע (משאלת empty state)
      setContent((prev) => (prev ? prev : seedContent + '\n\n'));
    }
    // נטענים פעם אחת בכל פתיחה
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seedContent]);

  function toggleTag(tag: IdeaTag) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  // אחרי queuedNote מוצג ל-1.8 שניות — סגור עם cleanup ב-unmount
  useAutoClear(
    queuedNote,
    () => {
      setQueuedNote(false);
      setOpen(false);
    },
    1800
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!content.trim()) return;
    const tagsArr = Array.from(tags);
    const ideaContent = content;
    const ideaImage = imageUrl;
    const ideaTranscript = voiceTranscript;

    function resetForm() {
      setContent('');
      setTags(new Set());
      setImageUrl(null);
      setVoiceTranscript(null);
    }

    async function queueLocally() {
      // הערה: ה-IDB queue לא תומך כרגע בתמונות/תמלול — נשמרים רק content+tags
      await addPendingIdea({
        content: ideaContent,
        tags: tagsArr,
        createdAt: new Date().toISOString(),
      });
      resetForm();
      setQueuedNote(true);
      window.dispatchEvent(new CustomEvent('idea-queued'));
    }

    // אם offline — שומר ב-IndexedDB ויסונכרן אוטומטית כשנחזור online
    if (isOffline) {
      startTransition(async () => {
        try {
          await queueLocally();
        } catch (err) {
          console.error('[idea] offline save failed', err);
        }
      });
      return;
    }

    const formData = new FormData();
    formData.append('content', ideaContent);
    tagsArr.forEach((t) => formData.append('tags', t));
    if (ideaImage) formData.append('imageUrl', ideaImage);
    if (ideaTranscript) formData.append('voiceTranscript', ideaTranscript);

    startTransition(async () => {
      const result = await createIdea(formData);
      if (result.ok) {
        resetForm();
        setOpen(false);
        return;
      }
      // אם השרת נכשל — נפילה ל-IndexedDB כדי לא לאבד את הרעיון (טקסט בלבד)
      try {
        await queueLocally();
      } catch {
        /* swallow — UI ישאר פתוח עם הטקסט */
      }
    });
  }

  // הוספת תמלול קולי לטקסט: מצרף בסוף עם רווח
  function appendTranscribed(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setContent((prev) => (prev.trim() ? `${prev}\n${trimmed}` : trimmed));
    // נשמור גם בנפרד ב-DB (זמין למחקר/חיפוש בעתיד)
    setVoiceTranscript((prev) => (prev ? `${prev}\n${trimmed}` : trimmed));
  }

  // Cmd/Ctrl+Enter שומר במהירות — חוויה כמו ב-Slack/Notion
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {/* ב-controlled mode — ללא trigger, הדיאלוג נשלט מבחוץ */}
      {!controlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="h-4 w-4" />
              {t('addNew')}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addNew')}</DialogTitle>
          <DialogDescription>{t('placeholder')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            autoFocus
            className="min-h-32"
            required
          />

          {/* הקלטה קולית + צירוף תמונה — מודחים אם אופליין */}
          {!isOffline && (
            <div className="flex flex-wrap items-center gap-2">
              <VoiceRecorder
                onTranscribed={appendTranscribed}
                disabled={isPending}
                enabled={whisperEnabled}
              />
              <ImageAttachment imageUrl={imageUrl} onUploaded={setImageUrl} />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('filterByTag')}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => (
                <TagChip
                  key={tag}
                  tag={tag}
                  active={tags.has(tag)}
                  onClick={() => toggleTag(tag)}
                  size="md"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {queuedNote && (
              <span className="flex items-center gap-1.5 text-xs text-amber-300">
                <WifiOff className="h-3.5 w-3.5" />
                {tOffline('queuedIdea')}
              </span>
            )}
            <Button
              type="submit"
              disabled={isPending || !content.trim()}
              className="ms-auto"
            >
              <Save className="h-4 w-4" />
              {isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
