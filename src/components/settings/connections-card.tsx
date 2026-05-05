'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  Youtube,
  Instagram,
  Music2,
  Plug,
  Unplug,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { disconnectPlatform } from '@/lib/channels/connections';
import type { ChannelConnection } from '@/lib/channels/types';

type Props = {
  connections: ChannelConnection[];
  youtubeOAuthConfigured: boolean;
  instagramOAuthConfigured: boolean;
  tiktokOAuthConfigured: boolean;
};

export function ConnectionsCard({
  connections,
  youtubeOAuthConfigured,
  instagramOAuthConfigured,
  tiktokOAuthConfigured,
}: Props) {
  const t = useTranslations('connections');

  const youtube = connections.find((c) => c.platform === 'youtube') ?? null;
  const instagram = connections.find((c) => c.platform === 'instagram') ?? null;
  const tiktok = connections.find((c) => c.platform === 'tiktok') ?? null;

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Plug className="h-4 w-4 text-creator-purple" />
        <h2 className="text-base font-semibold">{t('section')}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t('subtitle')}</p>

      <div className="space-y-3">
        <PlatformRow
          platform="youtube"
          icon={Youtube}
          name={t('youtube.name')}
          description={t('youtube.description')}
          connection={youtube}
          oauthReady={youtubeOAuthConfigured}
          missingHint={t('youtube.needsOAuth')}
          color="text-red-400"
        />
        <PlatformRow
          platform="instagram"
          icon={Instagram}
          name={t('instagram.name')}
          description={t('instagram.description')}
          connection={instagram}
          oauthReady={instagramOAuthConfigured}
          missingHint={t('instagram.comingSoon')}
          color="text-pink-400"
        />
        <PlatformRow
          platform="tiktok"
          icon={Music2}
          name={t('tiktok.name')}
          description={t('tiktok.description')}
          connection={tiktok}
          oauthReady={tiktokOAuthConfigured}
          missingHint={t('tiktok.comingSoon')}
          color="text-cyan-400"
        />
      </div>
    </Card>
  );
}

function PlatformRow({
  platform,
  icon: Icon,
  name,
  description,
  connection,
  oauthReady,
  missingHint,
  color,
}: {
  platform: 'youtube' | 'instagram' | 'tiktok';
  icon: typeof Youtube;
  name: string;
  description: string;
  connection: ChannelConnection | null;
  oauthReady: boolean;
  missingHint: string;
  color: string;
}) {
  const t = useTranslations('connections');
  const [isPending, startTransition] = useTransition();
  const isConnected = !!connection;

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectPlatform(platform);
    });
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        isConnected
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-border bg-card/40'
      )}
    >
      {/* Icon */}
      <div className={cn('mt-0.5 h-9 w-9 flex-shrink-0', color)}>
        {connection?.channel_thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={connection.channel_thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full',
              color,
              'bg-card'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{name}</p>
          {isConnected ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {t('connected')}
            </span>
          ) : !oauthReady ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              {t('notConnected')}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {t('notConnected')}
            </span>
          )}
        </div>
        {isConnected ? (
          <>
            <p className="text-xs text-muted-foreground">
              {connection.channel_name ?? '(no name)'}
              {connection.channel_handle && ` · @${connection.channel_handle}`}
            </p>
            {connection.connected_at && (
              <p className="text-[11px] text-muted-foreground">
                {t('since')} {format(new Date(connection.connected_at), 'dd/MM/yyyy')}
              </p>
            )}
          </>
        ) : oauthReady ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : (
          <p className="text-xs text-amber-300/90">{missingHint}</p>
        )}
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        {isConnected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={isPending}
            className="h-8 px-2 hover:text-red-400"
          >
            <Unplug className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('disconnect')}</span>
          </Button>
        ) : oauthReady ? (
          <a
            href={`/api/oauth/${platform}/init`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-creator-gradient px-3 text-xs font-medium text-white shadow-md shadow-creator-purple/20 transition-transform hover:scale-105"
          >
            <Plug className="h-3.5 w-3.5" />
            {t('connect')}
          </a>
        ) : (
          <span className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs text-muted-foreground">
            —
          </span>
        )}
      </div>
    </div>
  );
}
