import { Sparkles } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';
import { SetupGate } from '@/components/shared/setup-gate';
import { SignInForm } from '@/components/auth/sign-in-form';

export default async function AuthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // אם אין Supabase — מסך setup
  if (!isSupabaseConfigured()) {
    return <SetupGate missing={['Supabase']} />;
  }

  // אם כבר מחובר — חזור הביתה
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(`/${locale}`);
  }

  return <AuthContent />;
}

function AuthContent() {
  const t = useTranslations('auth');
  const tApp = useTranslations('app');

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center animate-fade-in">
      <div className="space-y-2 text-center">
        <div className="mx-auto mb-6 h-12 w-12 rounded-2xl bg-creator-gradient" />
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-base text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <SignInForm />
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-creator-purple" />
        <span>{tApp('tagline')}</span>
      </div>
    </div>
  );
}
