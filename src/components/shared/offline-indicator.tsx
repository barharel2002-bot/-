'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { countPendingIdeas } from '@/lib/offline/idb';
import { syncPendingIdeas } from '@/lib/offline/sync';

// בנר עליון שמופיע כשאופליין או כשיש פריטים בתור הסנכרון
export function OfflineIndicator() {
  const t = useTranslations('offline');
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    let mounted = true;

    async function refreshCount(): Promise<number> {
      try {
        const c = await countPendingIdeas();
        if (mounted) setPendingCount(c);
        return c;
      } catch {
        if (mounted) setPendingCount(0);
        return 0;
      }
    }

    async function doSync() {
      const before = await refreshCount();
      if (before === 0) return;
      const result = await syncPendingIdeas();
      await refreshCount();
      if (mounted && result.succeeded > 0) {
        setShowSynced(true);
        setTimeout(() => mounted && setShowSynced(false), 2500);
        router.refresh();
      }
    }

    function handleOnline() {
      if (!mounted) return;
      setIsOnline(true);
      doSync();
    }
    function handleOffline() {
      if (!mounted) return;
      setIsOnline(false);
    }

    setIsOnline(navigator.onLine);
    refreshCount().then((c) => {
      if (c > 0 && navigator.onLine) doSync();
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('idea-queued', refreshCount as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('idea-queued', refreshCount as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps — effect רץ רק פעם אחת ב-mount, router יציב

  if (isOnline && pendingCount === 0 && !showSynced) return null;

  let content: React.ReactNode;
  let toneClass = '';

  if (!isOnline) {
    content = (
      <>
        <WifiOff className="h-4 w-4" />
        <span>{t('indicator')}</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {pendingCount}
          </span>
        )}
      </>
    );
    toneClass = 'bg-amber-600 text-white';
  } else if (pendingCount > 0) {
    content = (
      <>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>{t('syncing', { count: pendingCount })}</span>
      </>
    );
    toneClass = 'bg-creator-purple text-white';
  } else {
    content = (
      <>
        <CheckCircle2 className="h-4 w-4" />
        <span>{t('synced')}</span>
      </>
    );
    toneClass = 'bg-emerald-600 text-white';
  }

  return (
    <div
      className={
        'fixed inset-x-0 top-14 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shadow-md ' +
        toneClass
      }
    >
      {content}
    </div>
  );
}
