import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import type { InsightsBullet } from '@/lib/youtube/types';

// כרטיס תובנות AI — מוצג בראש דף Analytics
export function InsightsCard({ bullets }: { bullets: InsightsBullet[] }) {
  const t = useTranslations('analytics');
  if (!bullets || bullets.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('insights')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="text-2xl leading-none shrink-0">{b.emoji}</span>
              <span className="text-sm leading-relaxed">{b.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
