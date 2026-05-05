'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendMagicLink } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/client';

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

  async function handleGoogleSignIn() {
    setStatus('idle');
    setErrorKey(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}`,
      },
    });
    if (error) {
      console.error('[auth] google sign-in failed:', error.message);
      setStatus('error');
      setErrorKey('error');
    }
    // הצלחה → Supabase מבצע redirect אוטומטי לדף ההסכמה של Google
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
    <div className="space-y-4">
      {/* Google sign-in (preferred — instant, no email round trip) */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={isPending}
        className="w-full"
      >
        <GoogleIcon />
        {t('continueWithGoogle')}
      </Button>

      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t('or')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Magic link fallback */}
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
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-11.3 8 12 12 0 1 1 7.9-21l5.6-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12a12 12 0 0 1 7.9 3l5.6-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 24 36a12 12 0 0 1-11.3-8L6 32.8A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.5l6.2 5.3a20 20 0 0 0 6.5-15.3c0-1.2-.1-2.4-.4-3z"
      />
    </svg>
  );
}
