'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const BUCKET = 'idea-images';

type Phase = 'idle' | 'uploading' | 'done';

type Props = {
  imageUrl: string | null;
  onUploaded: (url: string | null) => void;
};

// בחירת תמונה מהמכשיר → העלאה ל-Supabase Storage → URL חוזר
export function ImageAttachment({ imageUrl, onUploaded }: Props) {
  const t = useTranslations('ideas.image');
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>(imageUrl ? 'done' : 'idle');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorKey(null);

    if (file.size > MAX_IMAGE_BYTES) {
      setErrorKey('tooLarge');
      return;
    }

    setPhase('uploading');

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErrorKey('uploadFailed');
        setPhase('idle');
        return;
      }

      // נתיב: ${user_id}/${timestamp}.${ext} — מבטיח isolation בין משתמשים
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        // bucket חסר?
        if (uploadError.message.toLowerCase().includes('bucket')) {
          setErrorKey('needsBucket');
        } else {
          setErrorKey('uploadFailed');
        }
        setPhase('idle');
        return;
      }

      // signed URL — תקף שעה. לעוד זמן יש לקבל ב-IdeaCard
      const { data: signedData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7); // שבוע

      const url = signedData?.signedUrl ?? null;
      if (url) {
        onUploaded(url);
        setPhase('done');
      } else {
        setErrorKey('uploadFailed');
        setPhase('idle');
      }
    } catch (err) {
      console.error('[image] upload failed', err);
      setErrorKey('uploadFailed');
      setPhase('idle');
    } finally {
      // איפוס ה-input כדי לאפשר העלאת אותה תמונה שוב
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function remove() {
    onUploaded(null);
    setPhase('idle');
    setErrorKey(null);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        id="idea-image-input"
      />

      {phase === 'idle' && (
        <label
          htmlFor="idea-image-input"
          aria-label={t('attach')}
          title={t('attach')}
          className={cn(
            'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border transition-colors',
            'hover:border-creator-purple hover:text-creator-purple'
          )}
        >
          <ImagePlus className="h-4 w-4" />
        </label>
      )}

      {phase === 'uploading' && (
        <span className="flex h-9 items-center gap-2 rounded-full border border-border px-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('uploading')}
        </span>
      )}

      {phase === 'done' && imageUrl && (
        <div className="flex h-9 items-center gap-2 rounded-full border border-creator-purple/40 bg-creator-gradient-soft p-1 ps-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
          <button
            type="button"
            onClick={remove}
            aria-label={t('remove')}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {errorKey && (
        <span className="text-xs text-amber-300">{t(errorKey as any)}</span>
      )}
    </div>
  );
}
