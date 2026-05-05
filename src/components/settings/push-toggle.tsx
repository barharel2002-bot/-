'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellOff, Send, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getNotificationPermission,
} from '@/lib/push/client';

type Props = {
  vapidPublicKey: string | null;
  hasSubscription: boolean;
};

type Status = 'unsupported' | 'denied' | 'subscribed' | 'idle' | 'configuring';

export function PushToggle({ vapidPublicKey, hasSubscription }: Props) {
  const t = useTranslations('settings.reminders');
  const [status, setStatus] = useState<Status>('configuring');
  const [feedback, setFeedback] = useState<'success' | 'fail' | null>(null);
  const [isPending, startTransition] = useTransition();

  // קביעת סטטוס התחלתי בצד-לקוח (בגלל שאנחנו צריכים גישה ל-Notification API)
  useEffect(() => {
    if (!vapidPublicKey) {
      setStatus('unsupported');
      return;
    }
    const perm = getNotificationPermission();
    if (perm === 'unsupported') setStatus('unsupported');
    else if (perm === 'denied') setStatus('denied');
    else if (hasSubscription && perm === 'granted') setStatus('subscribed');
    else setStatus('idle');
  }, [vapidPublicKey, hasSubscription]);

  async function handleEnable() {
    if (!vapidPublicKey) return;
    setFeedback(null);
    startTransition(async () => {
      const sub = await subscribeToPush(vapidPublicKey);
      if (!sub) {
        setStatus(getNotificationPermission() === 'denied' ? 'denied' : 'idle');
        setFeedback('fail');
        return;
      }
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (res.ok) {
        setStatus('subscribed');
        setFeedback('success');
      } else {
        setFeedback('fail');
      }
    });
  }

  async function handleDisable() {
    setFeedback(null);
    startTransition(async () => {
      await unsubscribeFromPush();
      await fetch('/api/push/subscribe', { method: 'DELETE' });
      setStatus('idle');
    });
  }

  async function handleSendTest() {
    setFeedback(null);
    startTransition(async () => {
      const res = await fetch('/api/push/test', { method: 'POST' });
      setFeedback(res.ok ? 'success' : 'fail');
    });
  }

  if (status === 'configuring') return null;

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-creator-purple" />
        <h2 className="text-base font-semibold">{t('section')}</h2>
      </div>

      {status === 'unsupported' && (
        <p className="text-sm text-muted-foreground">{t('notSupported')}</p>
      )}

      {status === 'denied' && (
        <p className="text-sm text-amber-400">{t('denied')}</p>
      )}

      {status === 'idle' && (
        <Button onClick={handleEnable} disabled={isPending}>
          <Bell className="h-4 w-4" />
          {t('enable')}
        </Button>
      )}

      {status === 'subscribed' && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-emerald-400">
            <Bell className="h-4 w-4" />
            {t('enabled')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSendTest} disabled={isPending}>
              <Send className="h-4 w-4" />
              {t('sendTest')}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisable} disabled={isPending}>
              <BellOff className="h-4 w-4" />
              {t('disable')}
            </Button>
          </div>
          {feedback === 'success' && (
            <p className="text-xs text-emerald-400">{t('testSent')}</p>
          )}
          {feedback === 'fail' && (
            <p className="text-xs text-red-400">{t('testFailed')}</p>
          )}
        </div>
      )}

      <p className="flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
        <span>{t('scheduledTodo')}</span>
      </p>
    </Card>
  );
}
