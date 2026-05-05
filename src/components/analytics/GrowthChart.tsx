'use client';

import type { GrowthSeries } from '@/lib/analytics/queries';

// SVG sparkline — Top 5 videos by view count, last 30 days of snapshots.
// Light implementation — no chart library, just paths.
export function GrowthChart({ series }: { series: GrowthSeries[] }) {
  if (series.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Growth data appears after the second daily sync.
      </p>
    );
  }

  const allDates = [
    ...new Set(series.flatMap((s) => s.points.map((p) => p.date))),
  ].sort();

  if (allDates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Growth data appears after the second daily sync.
      </p>
    );
  }

  const maxViews = Math.max(
    1,
    ...series.flatMap((s) => s.points.map((p) => p.views))
  );

  const width = 600;
  const height = 200;
  const xStep = allDates.length > 1 ? width / (allDates.length - 1) : width;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-48 bg-zinc-900/40 rounded"
      >
        {series.slice(0, 5).map((s, idx) => {
          const dateToIdx = new Map(allDates.map((d, i) => [d, i]));
          const path = s.points
            .map((p, i) => {
              const x = (dateToIdx.get(p.date) ?? 0) * xStep;
              const y = height - (p.views / maxViews) * height;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');
          const hue = (idx * 67) % 360;
          return (
            <path
              key={s.videoId}
              d={path}
              stroke={`hsl(${hue},70%,60%)`}
              fill="none"
              strokeWidth={2}
            />
          );
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {series.slice(0, 5).map((s, idx) => {
          const hue = (idx * 67) % 360;
          return (
            <li key={s.videoId} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ background: `hsl(${hue},70%,60%)` }}
              />
              <span className="truncate max-w-[16ch]">{s.title || s.videoId}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
