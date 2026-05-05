'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendMagicLink } from '@/lib/auth/actions';

export function SignInForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [errorKey, setErrorKey] = useState<'error' | 'errorInvalidEmail' | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('idle');
    setErrorKey(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await sendMagicLink(formData);
      if (result.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
        setErrorKey(result.error ?? 'error');
      }
    });
  }

  // אחרי שליחה מוצלחת — מסך אישור
  if (status === 'sent') {
    return (
      <div className="space-y-4 text-center animate-fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-creator-gradient-soft">
          <CheckCircle2 className="h-7 w-7 text-creator-purple" />
        </div>
        <h2 className="text-xl font-semibold">{t('checkInbox')}</h2>
        <p className="text-sm text-muted-foreground">
          {email && <span className="font-mono text-foreground">{email}</span>}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="space-y-2">
        <Label htmlFor="email">{t('emailLabel')}</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="ps-9"
            dir="ltr"
          />
        </div>
        {errorKey && (
          <p className="text-sm text-red-400">{t(errorKey)}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        <Send className="h-4 w-4" />
        {isPending ? t('sending') : t('send')}
      </Button>
    </form>
  );
}
