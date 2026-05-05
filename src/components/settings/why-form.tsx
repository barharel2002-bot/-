'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Save, CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateProfile } from '@/lib/settings/actions';
import type { ReminderFrequency } from '@/types';

type Props = {
  whyInitial: string;
  forWhomInitial: string;
  frequencyInitial: ReminderFrequency;
};

const FREQUENCY_OPTIONS: ReminderFrequency[] = [
  'daily_morning',
  'daily_evening',
  'twice_week',
  'weekly',
];

export function WhyForm({ whyInitial, forWhomInitial, frequencyInitial }: Props) {
  const t = useTranslations('settings');
  const tFreq = useTranslations('settings.reminders.frequencies');

  const [why, setWhy] = useState(whyInitial);
  const [forWhom, setForWhom] = useState(forWhomInitial);
  const [frequency, setFrequency] = useState<ReminderFrequency>(frequencyInitial);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.ok) setSavedAt(Date.now());
    });
  }

  // סמן "נשמר" למשך 2.5 שניות
  const showSaved = savedAt && Date.now() - savedAt < 2500;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* בלוק ה-Why */}
      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-creator-purple" />
          <h2 className="text-base font-semibold">{t('why.section')}</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="why_i_create">{t('why.whyLabel')}</Label>
          <Textarea
            id="why_i_create"
            name="why_i_create"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder={t('why.whyPlaceholder')}
            className="min-h-28"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="for_whom">{t('why.forWhomLabel')}</Label>
          <Textarea
            id="for_whom"
            name="for_whom"
            value={forWhom}
            onChange={(e) => setForWhom(e.target.value)}
            placeholder={t('why.forWhomPlaceholder')}
            className="min-h-24"
          />
        </div>
      </Card>

      {/* בלוק תדירות */}
      <Card className="space-y-4 p-6">
        <h2 className="text-base font-semibold">{t('reminders.section')}</h2>

        <div className="space-y-2">
          <Label htmlFor="reminder_frequency">{t('reminders.frequencyLabel')}</Label>
          <select
            id="reminder_frequency"
            name="reminder_frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
            className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-creator-purple"
          >
            {FREQUENCY_OPTIONS.map((freq) => (
              <option key={freq} value={freq}>
                {tFreq(freq)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* כפתור שמירה לכל הטופס */}
      <div className="flex items-center justify-end gap-3">
        {showSaved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400 animate-fade-in">
            <CheckCircle2 className="h-4 w-4" />
            {t('why.saved')}
          </span>
        )}
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {t('why.save')}
        </Button>
      </div>
    </form>
  );
}
