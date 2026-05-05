'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Trash2, Edit2, Save, X, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TagChip } from './tag-chip';
import { deleteIdea, updateIdea } from '@/lib/ideas/actions';
import { PublishDialog } from '@/components/publish/publish-dialog';
import { DevelopChatDialog } from './develop-chat-dialog';
import type { IdeaRow } from '@/lib/ideas/queries';
import type { IdeaTag } from '@/types';

const ALL_TAGS: IdeaTag[] = ['story', 'reel', 'tiktok', 'spontaneous', 'develop', 'post'];

type Props = {
  idea: IdeaRow;
};

export function IdeaCard({ idea }: Props) {
  const t = useTranslations('ideas');
  const tPublish = useTranslations('publish');
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(idea.content);
  const [tags, setTags] = useState<Set<IdeaTag>>(new Set(idea.tags));
  const [publishOpen, setPublishOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formattedDate = format(new Date(idea.created_at), 'dd/MM/yyyy');

  function toggleTag(tag: IdeaTag) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function handleSave() {
    if (!content.trim()) return;
    const formData = new FormData();
    formData.append('content', content);
    tags.forEach((tag) => formData.append('tags', tag));

    startTransition(async () => {
      const result = await updateIdea(idea.id, formData);
      if (result.ok) setIsEditing(false);
    });
  }

  function handleCancel() {
    setContent(idea.content);
    setTags(new Set(idea.tags));
    setIsEditing(false);
  }

  function handleDelete() {
    if (!window.confirm(t('confirmDelete'))) return;
    startTransition(async () => {
      await deleteIdea(idea.id);
    });
  }

  if (isEditing) {
    return (
      <Card className="p-4 ring-2 ring-creator-purple/40">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
          className="border-transparent bg-transparent p-0 focus-visible:ring-0"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ALL_TAGS.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              active={tags.has(tag)}
              onClick={() => toggleTag(tag)}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending || !content.trim()}>
            <Save className="h-4 w-4" />
            {isPending ? t('saving') : t('save')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group overflow-hidden p-4 transition-colors hover:border-creator-purple/30">
      {idea.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={idea.image_url}
          alt=""
          className="-mx-4 -mt-4 mb-3 max-h-48 w-[calc(100%+2rem)] object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {idea.content}
      </p>

      {idea.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {idea.tags.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {idea.status === 'published' && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          )}
          {t('addedOn')} {formattedDate}
        </span>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {idea.status !== 'published' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPublishOpen(true)}
              title={tPublish('markAsPublished')}
              className="h-7 w-7 p-0 hover:text-emerald-400"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChatOpen(true)}
            title={t('developWithAI')}
            className="h-7 w-7 p-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-creator-purple" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            title={t('edit')}
            className="h-7 w-7 p-0"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            title={t('delete')}
            className="h-7 w-7 p-0 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        ideaId={idea.id}
        ideaPreview={idea.content}
      />

      <DevelopChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        ideaId={idea.id}
        ideaContent={idea.content}
      />
    </Card>
  );
}
