import { setRequestLocale } from 'next-intl/server';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Card } from '@/components/ui/card';
import { SetupStep, StepList } from '@/components/setup/setup-step';
import { CopyBlock } from '@/components/setup/copy-block';
import {
  isSupabaseConfigured,
  isAnthropicConfigured,
  isYouTubeConfigured,
  isOpenAIConfigured,
  isPushConfigured,
} from '@/lib/config';
import { SUPABASE_SCHEMA_SQL } from '@/lib/setup/schema-sql';

export default async function SetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // סטטוס כל הקונפיגים — נבדק בכל render
  const status = {
    supabase: isSupabaseConfigured(),
    anthropic: isAnthropicConfigured(),
    youtube: isYouTubeConfigured(),
    openai: isOpenAIConfigured(),
    vapid: isPushConfigured(),
  };

  const allRequired = status.supabase && status.anthropic;

  return (
    <div className="space-y-6 animate-fade-in">
      <Header allRequired={allRequired} />
      <SupabaseStep configured={status.supabase} />
      <AnthropicStep configured={status.anthropic} />
      <YouTubeStep configured={status.youtube} />
      <OpenAIStep configured={status.openai} />
      <VapidStep configured={status.vapid} />
      <RestartHint />
      <DoneCTA allRequired={allRequired} />
    </div>
  );
}

function Header({ allRequired }: { allRequired: boolean }) {
  const t = useTranslations('setup.wizard');
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-creator-purple" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {allRequired ? t('configured') : t('title')}
        </span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-base text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}

function SupabaseStep({ configured }: { configured: boolean }) {
  const t = useTranslations('setup.wizard.supabase');
  return (
    <SetupStep
      title={t('title')}
      description={t('description')}
      configured={configured}
      required
      externalUrl="https://supabase.com/dashboard"
    >
      <StepList
        items={[
          t('step1'),
          <>
            {t('step2')}
            <div className="mt-2">
              <CopyBlock
                text={SUPABASE_SCHEMA_SQL}
                label="schema.sql"
                language="sql"
              />
            </div>
          </>,
          t('step3'),
          <>
            {t('step4')}
            <div className="mt-2">
              <CopyBlock
                text={`NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...`}
                label=".env.local"
              />
            </div>
          </>,
          t('step5'),
        ]}
      />
    </SetupStep>
  );
}

function AnthropicStep({ configured }: { configured: boolean }) {
  const t = useTranslations('setup.wizard.anthropic');
  return (
    <SetupStep
      title={t('title')}
      description={t('description')}
      configured={configured}
      required
      externalUrl="https://console.anthropic.com/settings/keys"
    >
      <StepList
        items={[
          t('step1'),
          t('step2'),
          <>
            {t('step3')}
            <div className="mt-2">
              <CopyBlock
                text="ANTHROPIC_API_KEY=sk-ant-api03-..."
                label=".env.local"
              />
            </div>
          </>,
        ]}
      />
    </SetupStep>
  );
}

function YouTubeStep({ configured }: { configured: boolean }) {
  const t = useTranslations('setup.wizard.youtube');
  return (
    <SetupStep
      title={t('title')}
      description={t('description')}
      configured={configured}
      required={false}
      externalUrl="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
    >
      <StepList
        items={[
          t('step1'),
          <>
            {t('step2')}
            <div className="mt-2">
              <CopyBlock text="YOUTUBE_API_KEY=AIza..." label=".env.local" />
            </div>
          </>,
        ]}
      />
    </SetupStep>
  );
}

function OpenAIStep({ configured }: { configured: boolean }) {
  const t = useTranslations('setup.wizard.openai');
  return (
    <SetupStep
      title={t('title')}
      description={t('description')}
      configured={configured}
      required={false}
      externalUrl="https://platform.openai.com/api-keys"
    >
      <StepList
        items={[
          t('step1'),
          <>
            {t('step2')}
            <div className="mt-2">
              <CopyBlock text="OPENAI_API_KEY=sk-proj-..." label=".env.local" />
            </div>
          </>,
        ]}
      />
    </SetupStep>
  );
}

function VapidStep({ configured }: { configured: boolean }) {
  const t = useTranslations('setup.wizard.vapid');
  return (
    <SetupStep
      title={t('title')}
      description={t('description')}
      configured={configured}
      required={false}
    >
      <StepList
        items={[
          <>
            {t('step1')}
            <div className="mt-2">
              <CopyBlock
                text="npx web-push generate-vapid-keys"
                label="terminal"
                language="bash"
              />
            </div>
          </>,
          <>
            {t('step2')}
            <div className="mt-2">
              <CopyBlock
                text={`NEXT_PUBLIC_VAPID_PUBLIC_KEY=BNzL...
VAPID_PRIVATE_KEY=...`}
                label=".env.local"
              />
            </div>
          </>,
        ]}
      />
    </SetupStep>
  );
}

function RestartHint() {
  const t = useTranslations('setup.wizard');
  return (
    <Card className="border-creator-purple/30 bg-creator-gradient-soft p-4 text-sm">
      <p className="mb-1.5 font-medium">↻ {t('restartHint')}</p>
      <p className="text-xs text-muted-foreground">{t('refreshHint')}</p>
    </Card>
  );
}

function DoneCTA({ allRequired }: { allRequired: boolean }) {
  const t = useTranslations('setup.wizard');
  const locale = useLocale();
  const Arrow = locale === 'he' ? ArrowLeft : ArrowRight;
  if (!allRequired) return null;

  return (
    <Link
      href="/"
      className="flex items-center justify-center gap-2 rounded-2xl bg-creator-gradient p-5 text-base font-semibold text-white shadow-xl shadow-creator-purple/20 transition-transform hover:scale-[1.01]"
    >
      <span>{t('goToApp')}</span>
      <Arrow className="h-5 w-5" />
    </Link>
  );
}
