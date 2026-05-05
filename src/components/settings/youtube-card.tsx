'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { YouTubeChannelInput } from '@/components/shared/YouTubeChannelInput';
import { clearYouTubeChannel } from '@/lib/profile/youtube';

interface Props {
  channelId: string | null;
  channelUrl: string | null;
  channelTitle: string | null;
  channelThumbnail: string | null;
}

// כרטיס "הערוץ שלי ב-YouTube" — מציג קישור פעיל או מציע להוסיף
export function YouTubeCard({
  channelId,
  channelUrl,
  channelTitle,
  channelThumbnail,
}: Props) {
  const t = useTranslations('youtube');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings_label')}</CardTitle>
      </CardHeader>
      <CardContent>
        {channelId ? (
          <div className="flex items-center gap-3">
            {channelThumbnail && (
              <img
                src={channelThumbnail}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{channelTitle}</div>
              <div className="text-sm text-muted-foreground truncate">
                {channelUrl}
              </div>
            </div>
            <form
              action={async () => {
                await clearYouTubeChannel();
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                {t('clear')}
              </Button>
            </form>
          </div>
        ) : (
          <YouTubeChannelInput variant="settings" />
        )}
      </CardContent>
    </Card>
  );
}
