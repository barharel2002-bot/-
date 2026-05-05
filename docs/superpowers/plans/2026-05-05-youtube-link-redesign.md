# YouTube Channel Link Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual mark-as-published + manual analytics entry with a single paste-a-YouTube-channel-URL flow that auto-populates Weekly Mirror, Analytics, and a redesigned Style Swipes (Shorts) page.

**Architecture:** Channel URL stored on `profiles`. A 24h-cached sync layer (`src/lib/youtube/sync.ts`) populates two new cache tables (`youtube_videos`, `youtube_video_stats_history`) on page load. Mirror + Analytics read from those cache tables. Style Swipes consolidates 3 pages → 1, fetching Shorts from a curated channel list per category + user-tracked creators (no `search.list`). Old swipe pages, the publish flow, and manual metric entry are deleted.

**Tech Stack:** Next.js 14 (App Router) + TypeScript strict + Supabase (Postgres + Auth + RLS) + Anthropic SDK (Sonnet 4.6) + YouTube Data API v3 + Tailwind + Framer Motion + next-intl. New: `vitest` for unit tests on pure-logic modules.

**Source spec:** `docs/superpowers/specs/2026-05-05-youtube-link-redesign-design.md`

---

## File Structure

### Files created
| Path | Responsibility |
|---|---|
| `supabase/migrations/2026-05-05-youtube-link-redesign.sql` | DDL: drops old `channel_connections`/`tracked_channels`, adds new schema |
| `src/lib/youtube/types.ts` | Shared TS types (`SyncResult`, `SyncedVideo`, etc.) |
| `src/lib/youtube/parse-url.ts` | Pure: normalize a YouTube channel URL → `{ kind: 'handle' \| 'id' \| 'custom', value }` |
| `src/lib/youtube/channels.ts` | API client: `channels.list` (resolve URL → channelId + uploads playlist) |
| `src/lib/youtube/videos.ts` | API client: `playlistItems.list` + `videos.list` (batched stats) |
| `src/lib/youtube/quota.ts` | Daily YouTube quota counter (read/increment) |
| `src/lib/youtube/sync.ts` | Orchestrator: `syncUserYouTubeData(userId, force?)` |
| `src/lib/youtube/tone.ts` | AI tone classifier: per-video tone + week aggregate (one Sonnet call) |
| `src/lib/profile/youtube.ts` | Server actions: `setYouTubeChannel`, `clearYouTubeChannel` |
| `src/lib/analytics/insights.ts` | AI insights generator (Sonnet) — bullets at top of Analytics |
| `src/lib/swipes/shorts-feed.ts` | Merge categories pool + tracked-creators pool, dedupe, paginate |
| `src/lib/swipes/tracked-creators.ts` | Server actions: `addTrackedCreator`, `removeTrackedCreator` |
| `src/lib/swipes/categories.ts` | Server actions: `toggleShortsCategory` + queries |
| `src/components/shared/YouTubeChannelInput.tsx` | Reusable inline channel-link input (Settings + empty states) |
| `src/components/swipes/CategoriesPanel.tsx` | Chip-list toggle for Shorts categories |
| `src/components/swipes/TrackedCreatorsPanel.tsx` | Add/remove tracked creators UI |
| `src/components/swipes/ShortsDeck.tsx` | Replaces old SwipeDeck for unified `/swipe` |
| `src/components/analytics/InsightsCard.tsx` | Sonnet-generated bullets at page top |
| `src/components/analytics/GrowthChart.tsx` | Per-video sparkline of view-count over time |
| `tests/lib/youtube/parse-url.test.ts` | vitest |
| `tests/lib/youtube/quota.test.ts` | vitest |
| `tests/lib/youtube/sync.test.ts` | vitest (with mocks) |
| `tests/lib/swipes/shorts-feed.test.ts` | vitest |
| `vitest.config.ts` | Test runner config |

### Files modified
| Path | Change |
|---|---|
| `package.json` | Add `vitest`, `@vitest/ui`, `jsdom` devDeps + scripts |
| `src/config/creators.config.ts` | Extend `LearnCategory` config with curated channel handles per category for Shorts feed |
| `src/lib/mirror/queries.ts` | Read from `youtube_videos` instead of `published_content` |
| `src/lib/analytics/queries.ts` | Read from `youtube_videos` + `youtube_video_stats_history`; remove manual-write actions |
| `src/app/[locale]/mirror/page.tsx` | Trigger sync, show synced data, inline empty state |
| `src/app/[locale]/analytics/page.tsx` | Trigger sync, show new charts + insights, inline empty state |
| `src/app/[locale]/swipe/page.tsx` | Single combined page (replaces 3 children) |
| `src/app/[locale]/settings/page.tsx` | Add YouTube channel URL field |
| `src/components/layout/NavBar.tsx` | Remove `/swipe/edit` and `/swipe/photos` entries; collapse to single `/swipe` |
| `src/components/ideas/IdeaCard.tsx` | Remove "Mark as Published" button |
| `src/i18n/messages/he.json` | Add new keys, remove dead keys |
| `src/i18n/messages/en.json` | Same |
| `public/manifest.json` | Update PWA shortcuts (drop edit/photos shortcuts) |
| `src/types/index.ts` | Add `SyncedVideo`, `TrackedCreator`, `ShortsCategory` types |

### Files deleted
| Path | Why |
|---|---|
| `src/app/[locale]/swipe/edit/` (whole dir) | Spec §6.1 |
| `src/app/[locale]/swipe/photos/` (whole dir) | Spec §6.1 |
| `src/components/swipes/AddLinkForm.tsx` | Paste-link UI gone |
| `src/components/publish/` (whole dir) | "Mark as Published" gone |
| `src/components/analytics/MetricsDialog.tsx` | Manual metric entry gone |
| `src/app/api/swipes/og/` (whole dir) | OG fetcher unused |
| `src/lib/swipes/og-fetch.ts` | OG fetcher logic |
| `src/lib/swipes/og.ts` (if exists) | OG types |
| `src/lib/publish/` (whole dir) | publish actions |
| `supabase/migrations/20260504_channel_connections.sql` | Superseded by new migration |

---

## Phase Overview

The plan is split into 5 phases. Each phase ends with a passing build + working browser smoke test + a commit. Phases are sequential.

| # | Phase | What's working at phase end |
|---|---|---|
| 1 | Foundation: schema, sync layer, channel link UI | User can paste a YouTube URL on Settings or any empty state; data syncs into `youtube_videos`; quota counter increments |
| 2 | Weekly Mirror redesign | `/mirror` shows real synced posts + AI-classified tone for the week |
| 3 | Analytics redesign + AI insights | `/analytics` shows real metrics + 3 charts + growth-over-time + Sonnet bullets |
| 4 | Style Swipes redesign | Single `/swipe` with categories + tracked creators, swipe mechanics work |
| 5 | Removals + cleanup | Old swipe pages gone, publish flow gone, dead i18n keys gone, build clean |

If a reviewer wants per-phase merge gates, each phase can be lifted into its own plan/PR. They are written here as one document for narrative continuity.

---

# PHASE 1 — Foundation

Goal: schema migration applied + sync layer working + user can paste a channel URL.

## Task 1.1: Add vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add devDeps**

```bash
cd "C:\Users\Harel\OneDrive\מסמכים\אפליקציית תוכן"
npm install -D vitest @vitest/ui jsdom @testing-library/react@^16 @testing-library/jest-dom@^6
```

- [ ] **Step 2: Add npm scripts to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest",
"test:run": "vitest run",
"test:ui": "vitest --ui"
```

- [ ] **Step 3: Create `vitest.config.ts` at repo root**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: Verify**

```bash
npm run test:run
```

Expected: `No test files found` (passes — vitest is wired but we have no tests yet).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit tests"
```

---

## Task 1.2: Schema migration

**Files:**
- Create: `supabase/migrations/2026-05-05-youtube-link-redesign.sql`
- Delete: `supabase/migrations/20260504_channel_connections.sql`

- [ ] **Step 1: Delete the obsolete migration**

```bash
git rm supabase/migrations/20260504_channel_connections.sql
```

- [ ] **Step 2: Create the new migration**

Create `supabase/migrations/2026-05-05-youtube-link-redesign.sql` with:

```sql
-- ===================================================================
-- YouTube Channel Link Redesign
-- Drops the old multi-platform OAuth tables, adds a single-tenant
-- YouTube link + cache + history schema.
-- Run in Supabase SQL Editor.
-- ===================================================================

-- 1. Drop the obsolete OAuth-based tables (replaced by paste-URL design)
DROP TABLE IF EXISTS channel_connections CASCADE;
DROP TABLE IF EXISTS tracked_channels CASCADE;

-- 2. Profiles: 6 new columns for the linked channel
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS youtube_channel_url         TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_id          TEXT,
  ADD COLUMN IF NOT EXISTS youtube_uploads_playlist_id TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_title       TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_thumbnail   TEXT,
  ADD COLUMN IF NOT EXISTS youtube_synced_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS youtube_tone_cache          JSONB,
  ADD COLUMN IF NOT EXISTS youtube_insights_cache      JSONB;

-- 3. Cached video table
CREATE TABLE IF NOT EXISTS youtube_videos (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id         TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  published_at     TIMESTAMPTZ NOT NULL,
  duration_seconds INT NOT NULL,
  view_count       BIGINT NOT NULL DEFAULT 0,
  like_count       BIGINT NOT NULL DEFAULT 0,
  comment_count    BIGINT NOT NULL DEFAULT 0,
  thumbnail_url    TEXT,
  is_short         BOOLEAN NOT NULL DEFAULT FALSE,
  tone             TEXT,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX IF NOT EXISTS youtube_videos_user_published_idx
  ON youtube_videos (user_id, published_at DESC);

ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see only their videos" ON youtube_videos;
CREATE POLICY "users see only their videos" ON youtube_videos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Daily snapshots
CREATE TABLE IF NOT EXISTS youtube_video_stats_history (
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id       TEXT NOT NULL,
  snapshot_date  DATE NOT NULL,
  view_count     BIGINT NOT NULL,
  like_count     BIGINT NOT NULL,
  comment_count  BIGINT NOT NULL,
  PRIMARY KEY (video_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS yt_stats_user_date_idx
  ON youtube_video_stats_history (user_id, snapshot_date DESC);

ALTER TABLE youtube_video_stats_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see only their history" ON youtube_video_stats_history;
CREATE POLICY "users see only their history" ON youtube_video_stats_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Style Swipes — categories the user opted into
CREATE TABLE IF NOT EXISTS shorts_categories (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  TEXT NOT NULL,
  PRIMARY KEY (user_id, category_id)
);
ALTER TABLE shorts_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users own their categories" ON shorts_categories;
CREATE POLICY "users own their categories" ON shorts_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Style Swipes — tracked creators
CREATE TABLE IF NOT EXISTS tracked_creators (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id       TEXT NOT NULL,
  channel_url      TEXT NOT NULL,
  channel_title    TEXT NOT NULL,
  uploads_playlist TEXT NOT NULL,
  thumbnail_url    TEXT,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);
ALTER TABLE tracked_creators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users own their creators" ON tracked_creators;
CREATE POLICY "users own their creators" ON tracked_creators
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Daily YouTube quota counter (singleton row per date)
CREATE TABLE IF NOT EXISTS youtube_quota_daily (
  date        DATE PRIMARY KEY,
  units_used  INT NOT NULL DEFAULT 0
);
```

- [ ] **Step 3: Apply the migration to Supabase**

Open the Supabase project → SQL Editor → New query → paste the contents of the migration → Run.

Verify in Table Editor that `youtube_videos`, `youtube_video_stats_history`, `shorts_categories`, `tracked_creators`, `youtube_quota_daily` all exist, and `profiles` has the 8 new columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add YouTube link schema, drop old OAuth tables"
```

---

## Task 1.3: Shared YouTube types

**Files:**
- Create: `src/lib/youtube/types.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create `src/lib/youtube/types.ts`**

```ts
// טיפוסים משותפים לכל שכבת ה-YouTube
export interface ParsedChannelInput {
  kind: 'handle' | 'id' | 'custom';
  value: string;        // raw value extracted (e.g. 'AliAbdaal' for @AliAbdaal)
  raw: string;          // original user input
}

export interface ResolvedChannel {
  channelId: string;            // UCxxxx
  uploadsPlaylistId: string;    // UU... (or as returned by API)
  title: string;
  thumbnailUrl: string;
}

export interface SyncedVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;          // ISO
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
  isShort: boolean;
  tone?: string | null;
}

export type SyncResult =
  | { status: 'no-channel' }
  | { status: 'cached'; ageMs: number }
  | { status: 'quota-exceeded' }
  | { status: 'synced'; videoCount: number }
  | { status: 'error'; message: string };

export interface ToneAnalysis {
  perVideo: Record<string, string>;   // videoId → tone label
  dominant: { tone: string; rationale: string };
}

export interface InsightsBullet {
  emoji: string;
  text: string;
}
```

- [ ] **Step 2: Re-export from `src/types/index.ts`**

Append to the existing `src/types/index.ts`:

```ts
export type {
  ParsedChannelInput,
  ResolvedChannel,
  SyncedVideo,
  SyncResult,
  ToneAnalysis,
  InsightsBullet,
} from '@/lib/youtube/types';

export interface TrackedCreator {
  channelId: string;
  channelUrl: string;
  channelTitle: string;
  uploadsPlaylist: string;
  thumbnailUrl: string | null;
  addedAt: string;
}

export interface ShortsCategoryConfig {
  id: string;
  label: { he: string; en: string };
  channels: Array<{ handle: string; channelId: string; uploadsPlaylist: string }>;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/youtube/types.ts src/types/index.ts
git commit -m "feat(types): add YouTube link redesign shared types"
```

---

## Task 1.4: URL parser (TDD)

**Files:**
- Create: `tests/lib/youtube/parse-url.test.ts`
- Create: `src/lib/youtube/parse-url.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/youtube/parse-url.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseChannelInput } from '@/lib/youtube/parse-url';

describe('parseChannelInput', () => {
  it('parses bare @handle', () => {
    expect(parseChannelInput('@AliAbdaal')).toEqual({
      kind: 'handle',
      value: 'AliAbdaal',
      raw: '@AliAbdaal',
    });
  });

  it('parses youtube.com/@handle', () => {
    expect(parseChannelInput('https://youtube.com/@AliAbdaal')).toEqual({
      kind: 'handle',
      value: 'AliAbdaal',
      raw: 'https://youtube.com/@AliAbdaal',
    });
  });

  it('parses www.youtube.com/@handle with trailing slash', () => {
    expect(parseChannelInput('https://www.youtube.com/@AliAbdaal/')).toMatchObject({
      kind: 'handle',
      value: 'AliAbdaal',
    });
  });

  it('parses /channel/UC...', () => {
    expect(
      parseChannelInput('https://youtube.com/channel/UCJ24N4O0bP7LGLBDvye7oCA')
    ).toEqual({
      kind: 'id',
      value: 'UCJ24N4O0bP7LGLBDvye7oCA',
      raw: 'https://youtube.com/channel/UCJ24N4O0bP7LGLBDvye7oCA',
    });
  });

  it('parses /c/customname', () => {
    expect(parseChannelInput('https://youtube.com/c/MattDAvella')).toEqual({
      kind: 'custom',
      value: 'MattDAvella',
      raw: 'https://youtube.com/c/MattDAvella',
    });
  });

  it('throws on empty input', () => {
    expect(() => parseChannelInput('')).toThrow();
    expect(() => parseChannelInput('   ')).toThrow();
  });

  it('throws on non-youtube URL', () => {
    expect(() => parseChannelInput('https://example.com/foo')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

```bash
npm run test:run
```

Expected: FAIL — `Cannot find module '@/lib/youtube/parse-url'`.

- [ ] **Step 3: Implement `src/lib/youtube/parse-url.ts`**

```ts
import type { ParsedChannelInput } from './types';

const HANDLE_RE = /^@([A-Za-z0-9._-]+)$/;
const URL_HANDLE_RE = /(?:youtube\.com|youtu\.be)\/@([A-Za-z0-9._-]+)/;
const URL_ID_RE = /(?:youtube\.com|youtu\.be)\/channel\/(UC[\w-]{20,})/;
const URL_CUSTOM_RE = /(?:youtube\.com|youtu\.be)\/c\/([A-Za-z0-9._-]+)/;

// המרת קלט משתמש לסוג + value נורמלי לקריאה ל-channels.list
export function parseChannelInput(rawInput: string): ParsedChannelInput {
  const raw = rawInput;
  const trimmed = rawInput.trim();
  if (!trimmed) throw new Error('Empty channel input');

  // bare @handle
  const handleMatch = trimmed.match(HANDLE_RE);
  if (handleMatch) {
    return { kind: 'handle', value: handleMatch[1], raw };
  }

  // /channel/UC...
  const idMatch = trimmed.match(URL_ID_RE);
  if (idMatch) {
    return { kind: 'id', value: idMatch[1], raw };
  }

  // /@handle
  const urlHandleMatch = trimmed.match(URL_HANDLE_RE);
  if (urlHandleMatch) {
    return { kind: 'handle', value: urlHandleMatch[1], raw };
  }

  // /c/custom
  const customMatch = trimmed.match(URL_CUSTOM_RE);
  if (customMatch) {
    return { kind: 'custom', value: customMatch[1], raw };
  }

  throw new Error(`Could not parse channel input: ${trimmed}`);
}
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
npm run test:run
```

Expected: PASS — 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add tests/lib/youtube/parse-url.test.ts src/lib/youtube/parse-url.ts
git commit -m "feat(youtube): add channel URL parser"
```

---

## Task 1.5: Quota counter (TDD)

**Files:**
- Create: `tests/lib/youtube/quota.test.ts`
- Create: `src/lib/youtube/quota.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/youtube/quota.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOverQuotaThreshold, QUOTA_DAILY_CAP, QUOTA_WARN_THRESHOLD } from '@/lib/youtube/quota';

describe('quota thresholds', () => {
  it('cap is 10000 (YouTube Data API v3 default)', () => {
    expect(QUOTA_DAILY_CAP).toBe(10000);
  });

  it('warn threshold is 80% of cap', () => {
    expect(QUOTA_WARN_THRESHOLD).toBe(8000);
  });

  it('isOverQuotaThreshold returns false under threshold', () => {
    expect(isOverQuotaThreshold(0)).toBe(false);
    expect(isOverQuotaThreshold(7999)).toBe(false);
  });

  it('isOverQuotaThreshold returns true at and above threshold', () => {
    expect(isOverQuotaThreshold(8000)).toBe(true);
    expect(isOverQuotaThreshold(10000)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm run test:run -- quota
```

- [ ] **Step 3: Implement `src/lib/youtube/quota.ts`**

```ts
import { createClient } from '@/lib/supabase/server';

export const QUOTA_DAILY_CAP = 10_000;
export const QUOTA_WARN_THRESHOLD = 8_000;

export function isOverQuotaThreshold(unitsUsed: number): boolean {
  return unitsUsed >= QUOTA_WARN_THRESHOLD;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

// קריאה: כמה יחידות נוצלו היום
export async function getQuotaToday(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_quota_daily')
    .select('units_used')
    .eq('date', todayKey())
    .maybeSingle();
  return data?.units_used ?? 0;
}

// תוספת יחידות (אטומית — upsert + increment)
export async function addQuotaUnits(units: number): Promise<void> {
  if (units <= 0) return;
  const supabase = await createClient();
  const date = todayKey();
  // upsert: אם השורה לא קיימת, צור עם units_used=units; אם כן, הוסף
  const { error } = await supabase.rpc('increment_youtube_quota', {
    p_date: date,
    p_units: units,
  });
  if (error) {
    // fallback אם ה-RPC לא הוגדר עדיין: read-modify-write
    const current = await getQuotaToday();
    await supabase
      .from('youtube_quota_daily')
      .upsert({ date, units_used: current + units }, { onConflict: 'date' });
  }
}
```

- [ ] **Step 4: Add the RPC to the migration (so step 3's atomic path works)**

Edit `supabase/migrations/2026-05-05-youtube-link-redesign.sql`, append:

```sql
-- 8. Atomic quota increment
CREATE OR REPLACE FUNCTION increment_youtube_quota(p_date DATE, p_units INT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO youtube_quota_daily(date, units_used)
  VALUES (p_date, p_units)
  ON CONFLICT (date) DO UPDATE
    SET units_used = youtube_quota_daily.units_used + EXCLUDED.units_used;
END;
$$ LANGUAGE plpgsql;
```

Re-run the (full) migration in Supabase SQL Editor.

- [ ] **Step 5: Run tests, confirm pass**

```bash
npm run test:run -- quota
```

Expected: 4 tests passing.

- [ ] **Step 6: Commit**

```bash
git add tests/lib/youtube/quota.test.ts src/lib/youtube/quota.ts supabase/migrations/2026-05-05-youtube-link-redesign.sql
git commit -m "feat(youtube): daily quota counter + atomic RPC"
```

---

## Task 1.6: channels.list helper

**Files:**
- Create: `src/lib/youtube/channels.ts`

- [ ] **Step 1: Implement**

```ts
import type { ParsedChannelInput, ResolvedChannel } from './types';
import { addQuotaUnits } from './quota';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

// resolve user input → canonical channel + uploads playlist
export async function resolveChannel(
  parsed: ParsedChannelInput
): Promise<ResolvedChannel> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');

  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    key: apiKey,
  });
  if (parsed.kind === 'id') {
    params.set('id', parsed.value);
  } else if (parsed.kind === 'handle') {
    params.set('forHandle', `@${parsed.value}`);
  } else {
    // 'custom' — YouTube no longer exposes /c/ resolution directly via API.
    // Best effort: search for the channel.
    return resolveByCustomName(parsed.value, apiKey);
  }

  const res = await fetch(`${API_BASE}/channels?${params}`, { cache: 'no-store' });
  await addQuotaUnits(1);
  if (!res.ok) {
    throw new Error(`channels.list ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error('Channel not found');

  return {
    channelId: item.id,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? '',
    title: item.snippet?.title ?? '',
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.default?.url ??
      '',
  };
}

async function resolveByCustomName(
  name: string,
  apiKey: string
): Promise<ResolvedChannel> {
  // search.list costs 100 units — used only as fallback for /c/ URLs
  const searchParams = new URLSearchParams({
    part: 'snippet',
    q: name,
    type: 'channel',
    maxResults: '1',
    key: apiKey,
  });
  const sRes = await fetch(`${API_BASE}/search?${searchParams}`, { cache: 'no-store' });
  await addQuotaUnits(100);
  if (!sRes.ok) throw new Error(`search.list ${sRes.status}`);
  const sData = await sRes.json();
  const sItem = sData.items?.[0];
  if (!sItem) throw new Error('Channel not found via search');
  const channelId = sItem.snippet?.channelId ?? sItem.id?.channelId;
  if (!channelId) throw new Error('No channelId in search result');
  // Now fetch full details
  return resolveChannel({ kind: 'id', value: channelId, raw: name });
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/youtube/channels.ts
git commit -m "feat(youtube): resolve channel URL → canonical id + uploads playlist"
```

---

## Task 1.7: videos.list + playlistItems.list helpers

**Files:**
- Create: `src/lib/youtube/videos.ts`

- [ ] **Step 1: Implement**

```ts
import type { SyncedVideo } from './types';
import { addQuotaUnits } from './quota';
import { parseDurationToSeconds } from './search';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

// Fetch up to 50 most recent video IDs from an uploads playlist
export async function listUploadsPlaylist(
  uploadsPlaylistId: string,
  maxResults = 50
): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');
  if (!uploadsPlaylistId) return [];

  const params = new URLSearchParams({
    part: 'contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
    key: apiKey,
  });
  const res = await fetch(`${API_BASE}/playlistItems?${params}`, { cache: 'no-store' });
  await addQuotaUnits(1);
  if (!res.ok) throw new Error(`playlistItems.list ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.items ?? [])
    .map((it: any) => it?.contentDetails?.videoId)
    .filter((v: string | undefined): v is string => !!v);
}

// Batched videos.list — up to 50 ids per call
export async function fetchVideoDetails(videoIds: string[]): Promise<SyncedVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY missing');
  if (videoIds.length === 0) return [];

  const out: SyncedVideo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: batch.join(','),
      key: apiKey,
    });
    const res = await fetch(`${API_BASE}/videos?${params}`, { cache: 'no-store' });
    await addQuotaUnits(1);
    if (!res.ok) throw new Error(`videos.list ${res.status}: ${await res.text()}`);
    const data = await res.json();
    for (const item of data.items ?? []) {
      const durationSec = parseDurationToSeconds(item?.contentDetails?.duration);
      const description: string = item?.snippet?.description ?? '';
      out.push({
        videoId: item.id,
        title: item?.snippet?.title ?? '',
        description,
        publishedAt: item?.snippet?.publishedAt ?? '',
        durationSeconds: durationSec,
        viewCount: Number(item?.statistics?.viewCount ?? 0),
        likeCount: Number(item?.statistics?.likeCount ?? 0),
        commentCount: Number(item?.statistics?.commentCount ?? 0),
        thumbnailUrl:
          item?.snippet?.thumbnails?.high?.url ??
          item?.snippet?.thumbnails?.medium?.url ??
          '',
        isShort:
          (durationSec > 0 && durationSec <= 60) || /#shorts/i.test(description),
      });
    }
  }
  return out;
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/youtube/videos.ts
git commit -m "feat(youtube): playlistItems + videos.list batched helpers"
```

---

## Task 1.8: Sync orchestrator

**Files:**
- Create: `src/lib/youtube/sync.ts`

- [ ] **Step 1: Implement**

```ts
import { createClient } from '@/lib/supabase/server';
import { listUploadsPlaylist, fetchVideoDetails } from './videos';
import { getQuotaToday, isOverQuotaThreshold, addQuotaUnits } from './quota';
import type { SyncResult, SyncedVideo } from './types';

const SYNC_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function syncUserYouTubeData(
  userId: string,
  force = false
): Promise<SyncResult> {
  const supabase = await createClient();

  // 1. Read profile YT fields
  const { data: profile } = await supabase
    .from('profiles')
    .select('youtube_channel_id,youtube_uploads_playlist_id,youtube_synced_at')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.youtube_channel_id || !profile?.youtube_uploads_playlist_id) {
    return { status: 'no-channel' };
  }

  // 2. Cache check
  if (!force && profile.youtube_synced_at) {
    const ageMs = Date.now() - new Date(profile.youtube_synced_at).getTime();
    if (ageMs < SYNC_TTL_MS) return { status: 'cached', ageMs };
  }

  // 3. Quota guardrail
  const used = await getQuotaToday();
  if (isOverQuotaThreshold(used)) return { status: 'quota-exceeded' };

  try {
    // 4. Fetch uploads playlist → video IDs
    const ids = await listUploadsPlaylist(profile.youtube_uploads_playlist_id, 50);
    if (ids.length === 0) {
      await supabase
        .from('profiles')
        .update({ youtube_synced_at: new Date().toISOString() })
        .eq('id', userId);
      return { status: 'synced', videoCount: 0 };
    }

    // 5. Fetch full video details
    const videos = await fetchVideoDetails(ids);

    // 6. Upsert into youtube_videos
    const rows = videos.map((v) => ({
      user_id: userId,
      video_id: v.videoId,
      title: v.title,
      description: v.description,
      published_at: v.publishedAt,
      duration_seconds: v.durationSeconds,
      view_count: v.viewCount,
      like_count: v.likeCount,
      comment_count: v.commentCount,
      thumbnail_url: v.thumbnailUrl,
      is_short: v.isShort,
      synced_at: new Date().toISOString(),
    }));
    const { error: upsertErr } = await supabase
      .from('youtube_videos')
      .upsert(rows, { onConflict: 'user_id,video_id' });
    if (upsertErr) throw upsertErr;

    // 7. Stats history snapshot for today
    const today = new Date().toISOString().slice(0, 10);
    const historyRows = videos.map((v) => ({
      user_id: userId,
      video_id: v.videoId,
      snapshot_date: today,
      view_count: v.viewCount,
      like_count: v.likeCount,
      comment_count: v.commentCount,
    }));
    // INSERT ... ON CONFLICT DO NOTHING — first sync of the day wins
    await supabase
      .from('youtube_video_stats_history')
      .upsert(historyRows, { onConflict: 'video_id,snapshot_date', ignoreDuplicates: true });

    // 8. Mark synced
    await supabase
      .from('profiles')
      .update({ youtube_synced_at: new Date().toISOString() })
      .eq('id', userId);

    return { status: 'synced', videoCount: videos.length };
  } catch (err: any) {
    console.error('[youtube.sync] failed:', err.message);
    return { status: 'error', message: err.message };
  }
}

// Helper for callers: read cached videos
export async function getCachedVideos(userId: string): Promise<SyncedVideo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_videos')
    .select('*')
    .eq('user_id', userId)
    .order('published_at', { ascending: false });
  return (data ?? []).map((r: any) => ({
    videoId: r.video_id,
    title: r.title,
    description: r.description ?? '',
    publishedAt: r.published_at,
    durationSeconds: r.duration_seconds,
    viewCount: Number(r.view_count),
    likeCount: Number(r.like_count),
    commentCount: Number(r.comment_count),
    thumbnailUrl: r.thumbnail_url ?? '',
    isShort: r.is_short,
    tone: r.tone,
  }));
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/youtube/sync.ts
git commit -m "feat(youtube): sync orchestrator with 24h cache + quota guard"
```

---

## Task 1.9: Profile server actions for the channel link

**Files:**
- Create: `src/lib/profile/youtube.ts`

- [ ] **Step 1: Implement**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseChannelInput } from '@/lib/youtube/parse-url';
import { resolveChannel } from '@/lib/youtube/channels';

export async function setYouTubeChannel(formData: FormData) {
  const raw = String(formData.get('youtube_url') ?? '').trim();
  if (!raw) return { ok: false as const, error: 'אנא הדבק קישור לערוץ YouTube' };

  let parsed;
  try {
    parsed = parseChannelInput(raw);
  } catch (e: any) {
    return { ok: false as const, error: 'הקישור לא תקין — בדוק שזה כתובת ערוץ YouTube' };
  }

  let resolved;
  try {
    resolved = await resolveChannel(parsed);
  } catch (e: any) {
    return { ok: false as const, error: 'לא הצלחנו למצוא את הערוץ. בדוק את הקישור.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      youtube_channel_url: raw,
      youtube_channel_id: resolved.channelId,
      youtube_uploads_playlist_id: resolved.uploadsPlaylistId,
      youtube_channel_title: resolved.title,
      youtube_channel_thumbnail: resolved.thumbnailUrl,
      youtube_synced_at: null, // force a sync next page load
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/[locale]/settings', 'page');
  revalidatePath('/[locale]/mirror', 'page');
  revalidatePath('/[locale]/analytics', 'page');
  revalidatePath('/[locale]/swipe', 'page');
  return { ok: true as const, channelTitle: resolved.title };
}

export async function clearYouTubeChannel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  // Wipe profile fields + cached data
  await supabase
    .from('profiles')
    .update({
      youtube_channel_url: null,
      youtube_channel_id: null,
      youtube_uploads_playlist_id: null,
      youtube_channel_title: null,
      youtube_channel_thumbnail: null,
      youtube_synced_at: null,
      youtube_tone_cache: null,
      youtube_insights_cache: null,
    })
    .eq('id', user.id);

  await supabase.from('youtube_videos').delete().eq('user_id', user.id);
  await supabase.from('youtube_video_stats_history').delete().eq('user_id', user.id);

  revalidatePath('/[locale]/settings', 'page');
  return { ok: true as const };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/profile/youtube.ts
git commit -m "feat(profile): server actions for setting/clearing YouTube channel link"
```

---

## Task 1.10: Reusable channel-link input component

**Files:**
- Create: `src/components/shared/YouTubeChannelInput.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setYouTubeChannel } from '@/lib/profile/youtube';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  variant?: 'inline' | 'settings';
  onSaved?: () => void;
}

export function YouTubeChannelInput({ variant = 'inline', onSaved }: Props) {
  const t = useTranslations('youtube');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await setYouTubeChannel(formData);
      if (!res.ok) setError(res.error);
      else onSaved?.();
    });
  }

  return (
    <form action={action} className="flex flex-col gap-2 max-w-md mx-auto">
      <label className="text-sm text-muted-foreground">
        {variant === 'inline' ? t('inline_prompt') : t('settings_label')}
      </label>
      <div className="flex gap-2">
        <Input
          name="youtube_url"
          type="url"
          placeholder="https://youtube.com/@your-handle"
          required
          disabled={pending}
        />
        <Button type="submit" disabled={pending}>
          {pending ? t('saving') : t('save')}
        </Button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Add i18n keys**

In `src/i18n/messages/he.json`, add:

```json
"youtube": {
  "inline_prompt": "הדבק קישור לערוץ ה-YouTube שלך כדי לראות את הנתונים",
  "settings_label": "הערוץ שלי ב-YouTube",
  "save": "שמור",
  "saving": "שומר…",
  "clear": "נתק ערוץ",
  "synced_just_now": "סונכרן עכשיו",
  "synced_ago": "סונכרן לפני {time}",
  "no_videos_this_week": "אין העלאות חדשות השבוע — על מה עובדים?",
  "quota_exceeded": "הגענו למגבלת ה-API היומית של YouTube. הנתונים יהיו עדכניים שוב מחר."
}
```

In `src/i18n/messages/en.json`, add:

```json
"youtube": {
  "inline_prompt": "Paste a link to your YouTube channel to see your data",
  "settings_label": "My YouTube channel",
  "save": "Save",
  "saving": "Saving…",
  "clear": "Disconnect channel",
  "synced_just_now": "Synced just now",
  "synced_ago": "Synced {time} ago",
  "no_videos_this_week": "No new uploads this week — what are you cooking?",
  "quota_exceeded": "Reached today's YouTube API limit. Fresh data will be back tomorrow."
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/YouTubeChannelInput.tsx src/i18n/messages/he.json src/i18n/messages/en.json
git commit -m "feat(ui): YouTubeChannelInput shared component + i18n"
```

---

## Task 1.11: Add channel-link field to Settings

**Files:**
- Modify: `src/app/[locale]/settings/page.tsx`

- [ ] **Step 1: Read the existing settings page**

```bash
cat src/app/[locale]/settings/page.tsx
```

- [ ] **Step 2: Insert the YouTube section above the push toggle**

Find the section that renders push notification controls. Above it, add:

```tsx
import { YouTubeChannelInput } from '@/components/shared/YouTubeChannelInput';
import { clearYouTubeChannel } from '@/lib/profile/youtube';

// inside the JSX, in a new <Card>:
<Card>
  <CardHeader>
    <CardTitle>{t('youtube.settings_label')}</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {profile?.youtube_channel_id ? (
      <div className="flex items-center gap-3">
        <img
          src={profile.youtube_channel_thumbnail ?? ''}
          alt=""
          className="h-12 w-12 rounded-full"
        />
        <div className="flex-1">
          <div className="font-medium">{profile.youtube_channel_title}</div>
          <div className="text-sm text-muted-foreground">
            {profile.youtube_channel_url}
          </div>
        </div>
        <form action={clearYouTubeChannel}>
          <Button type="submit" variant="ghost" size="sm">
            {t('youtube.clear')}
          </Button>
        </form>
      </div>
    ) : (
      <YouTubeChannelInput variant="settings" />
    )}
  </CardContent>
</Card>
```

(Adjust imports of `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Button` to match existing imports in that file.)

Make sure the page's data fetch reads the new profile columns — find where the profile query is and add `youtube_channel_id, youtube_channel_url, youtube_channel_title, youtube_channel_thumbnail` to the `select(...)`.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Open `http://localhost:3000/he/settings`. Confirm:
- Empty channel state shows the input form
- Pasting `@AliAbdaal` (or any real handle) → on submit, the section flips to show the channel name + thumbnail
- "Disconnect channel" button removes the connection
- The same page in `/en/settings` shows English copy

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/settings/page.tsx
git commit -m "feat(settings): add YouTube channel link section"
```

---

## Task 1.12: Phase 1 verification + smoke test

- [ ] **Step 1: Type-check, lint, build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: all clean.

- [ ] **Step 2: Run all tests**

```bash
npm run test:run
```

Expected: all tests passing (parse-url + quota).

- [ ] **Step 3: End-to-end manual smoke test**

In a browser:
1. Go to `/he/settings` → connect a real YouTube channel
2. Confirm the channel info shows
3. Open Supabase Table Editor → `profiles` → confirm the 5 columns are populated
4. Open Supabase → `youtube_videos` → still empty (sync hasn't run yet — Mirror/Analytics will trigger it in Phase 2)

- [ ] **Step 4: Commit if anything was tweaked**

If no further changes, the prior commits stand. Otherwise:

```bash
git add -A && git commit -m "chore: phase 1 polish"
```

**Phase 1 done.**

---

# PHASE 2 — Weekly Mirror redesign

Goal: `/mirror` reads from `youtube_videos`, runs AI tone analysis as part of sync, shows real synced data + tone label.

> **Phase 2/3 prerequisite — read the existing AI budget guardrail before you start.**
> Run `cat src/lib/ai/budget.ts` (and any peer files under `src/lib/ai/`) so you understand the wrapper used by Copy Agent and Video Analyzer. Every Anthropic call added in Tasks 2.1, 2.2, and 3.2 must go through that same guardrail (warn at 80% of `ai_monthly_budget_cents`, soft-block at 100%). If the existing pattern is `await withBudget(userId, async (client) => { ... })` or similar, mirror it. Do not call `client.messages.create` directly — that bypasses the cap.

## Task 2.1: AI tone classifier

**Files:**
- Create: `src/lib/youtube/tone.ts`

- [ ] **Step 1: Implement**

```ts
import Anthropic from '@anthropic-ai/sdk';
import type { SyncedVideo, ToneAnalysis } from './types';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

export async function analyzeTone(videos: SyncedVideo[]): Promise<ToneAnalysis> {
  if (videos.length === 0) {
    return { perVideo: {}, dominant: { tone: 'unknown', rationale: '' } };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  const client = new Anthropic({ apiKey });

  const videoList = videos
    .map((v, i) => `${i + 1}. [${v.videoId}] "${v.title}" — ${v.description.slice(0, 200)}`)
    .join('\n');

  const systemPrompt = `You classify the *tone* of short-form social video posts.
Allowed tone labels (English, single word): authoritative, playful, inspirational,
educational, humorous, vulnerable, hype, contemplative, contrarian, calm.
For each video return one label. Then state the week's *dominant* tone with a
one-sentence rationale.

Output ONLY a JSON object:
{
  "perVideo": { "<videoId>": "<tone>", ... },
  "dominant": { "tone": "<tone>", "rationale": "<one sentence>" }
}`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: `Classify these videos:\n\n${videoList}\n\nReturn JSON only.`,
      },
    ],
  });

  const text = resp.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  const json = extractJson(text);
  return {
    perVideo: json.perVideo ?? {},
    dominant: json.dominant ?? { tone: 'unknown', rationale: '' },
  };
}

function extractJson(text: string): any {
  // Tolerate code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/youtube/tone.ts
git commit -m "feat(youtube): AI tone classifier (per-video + week aggregate)"
```

---

## Task 2.2: Wire tone analysis into sync

**Files:**
- Modify: `src/lib/youtube/sync.ts`

- [ ] **Step 1: Add tone step**

After step 6 (upsert into `youtube_videos`) and before step 7 (stats history), insert:

```ts
// 6.5 — AI tone analysis (one Sonnet call, classifies all 50 videos)
let toneByVideo: Record<string, string> = {};
let dominantTone: { tone: string; rationale: string } = { tone: 'unknown', rationale: '' };
try {
  const tone = await analyzeTone(videos);
  toneByVideo = tone.perVideo;
  dominantTone = tone.dominant;

  // Update tone column on each video
  const updates = Object.entries(toneByVideo).map(([videoId, tone]) => ({
    user_id: userId,
    video_id: videoId,
    tone,
  }));
  if (updates.length > 0) {
    // Upsert with only the tone field — keep other columns
    for (const u of updates) {
      await supabase
        .from('youtube_videos')
        .update({ tone: u.tone })
        .eq('user_id', u.user_id)
        .eq('video_id', u.video_id);
    }
  }
} catch (e: any) {
  console.error('[youtube.sync] tone analysis failed:', e.message);
  // Non-fatal — continue without tone
}

// Persist week-level dominant tone on profiles
await supabase
  .from('profiles')
  .update({ youtube_tone_cache: dominantTone })
  .eq('id', userId);
```

Add the import at the top:

```ts
import { analyzeTone } from './tone';
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/youtube/sync.ts
git commit -m "feat(youtube): integrate AI tone analysis into sync"
```

---

## Task 2.3: Mirror queries — read from synced data

**Files:**
- Modify: `src/lib/mirror/queries.ts`

- [ ] **Step 1: Read current file**

```bash
cat src/lib/mirror/queries.ts
```

- [ ] **Step 2: Replace the "this week's posts" query**

Find the function that aggregates the week's published content (probably `getThisWeekPosts` or similar). Replace its body with:

```ts
export async function getThisWeekVideos(userId: string) {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('youtube_videos')
    .select('video_id,title,thumbnail_url,published_at,is_short,view_count,like_count,tone')
    .eq('user_id', userId)
    .gte('published_at', sevenDaysAgo)
    .order('published_at', { ascending: false });
  return data ?? [];
}

export async function getActivityHours(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_videos')
    .select('published_at')
    .eq('user_id', userId);
  const buckets = new Array(24).fill(0);
  for (const r of data ?? []) {
    const h = new Date(r.published_at).getHours();
    buckets[h] += 1;
  }
  return buckets;
}

export async function getDominantTone(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('youtube_tone_cache')
    .eq('id', userId)
    .maybeSingle();
  return (data?.youtube_tone_cache as { tone: string; rationale: string } | null) ?? null;
}
```

Keep the existing queries that read from `ideas` (drafts list, undeveloped ideas, liked styles) untouched.

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/mirror/queries.ts
git commit -m "feat(mirror): query synced YouTube data instead of published_content"
```

---

## Task 2.4: Mirror page — sync trigger + new sections

**Files:**
- Modify: `src/app/[locale]/mirror/page.tsx`

- [ ] **Step 1: Read existing page**

```bash
cat "src/app/[locale]/mirror/page.tsx"
```

- [ ] **Step 2: Update**

Add at the top of the server component:

```tsx
import { syncUserYouTubeData } from '@/lib/youtube/sync';
import { getThisWeekVideos, getActivityHours, getDominantTone } from '@/lib/mirror/queries';
import { YouTubeChannelInput } from '@/components/shared/YouTubeChannelInput';

export default async function MirrorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in');

  // Trigger sync (no-op if cache is fresh)
  const syncResult = await syncUserYouTubeData(user.id);

  // Banner copy for non-fatal sync states (rendered above the content if needed)
  const banner =
    syncResult.status === 'quota-exceeded' ? t('youtube.quota_exceeded') :
    syncResult.status === 'error' ? t('mirror.sync_failed') :
    null;

  // No channel → show inline input
  if (syncResult.status === 'no-channel') {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">{t('mirror.title')}</h1>
        <YouTubeChannelInput />
      </main>
    );
  }

  const [thisWeek, activity, tone] = await Promise.all([
    getThisWeekVideos(user.id),
    getActivityHours(user.id),
    getDominantTone(user.id),
  ]);

  // Pass these into existing MirrorView component or render directly here
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('mirror.title')}</h1>

      {banner && (
        <div className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
          {banner}
        </div>
      )}

      {/* Tone */}
      {tone && (
        <Card>
          <CardHeader><CardTitle>{t('mirror.dominant_tone')}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tone.tone}</div>
            <p className="text-sm text-muted-foreground mt-1">{tone.rationale}</p>
          </CardContent>
        </Card>
      )}

      {/* This week */}
      <Card>
        <CardHeader><CardTitle>{t('mirror.this_week', { count: thisWeek.length })}</CardTitle></CardHeader>
        <CardContent>
          {thisWeek.length === 0 ? (
            <p className="text-muted-foreground">{t('youtube.no_videos_this_week')}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {thisWeek.map((v) => (
                <a
                  key={v.video_id}
                  href={`https://youtube.com/watch?v=${v.video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img src={v.thumbnail_url ?? ''} alt={v.title} className="w-full rounded" />
                  <p className="text-sm mt-1 line-clamp-2">{v.title}</p>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity hours */}
      <Card>
        <CardHeader><CardTitle>{t('mirror.activity_hours')}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-24 items-end gap-px">
            {activity.map((count, hour) => (
              <div key={hour} className="flex-1 bg-violet-500/40 rounded-t" style={{ height: `${count * 8}px` }} title={`${hour}:00 — ${count}`} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Existing local sections (drafts, undeveloped, liked styles) — keep these */}
      {/* ... existing JSX ... */}
    </main>
  );
}
```

- [ ] **Step 3: Add i18n keys**

`he.json`:
```json
"mirror": {
  "title": "מראה שבועית",
  "dominant_tone": "טון דומיננטי השבוע",
  "this_week": "פוסטים השבוע ({count})",
  "activity_hours": "שעות פעילות",
  "sync_failed": "לא הצלחנו לרענן מ-YouTube. מציג נתונים מהמטמון."
}
```

`en.json`:
```json
"mirror": {
  "title": "Weekly Mirror",
  "dominant_tone": "Dominant tone this week",
  "this_week": "Posts this week ({count})",
  "activity_hours": "Activity hours",
  "sync_failed": "Could not refresh from YouTube. Showing cached data."
}
```

(Merge with existing `mirror.*` keys; replace any old keys for "this week" derived from published_content.)

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Visit `/he/mirror`. Connect a channel via the inline form (or already connected from Phase 1). On first load, the page may take 2-3 seconds (sync running). On reload within 24h: instant.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/mirror/page.tsx" src/i18n/messages/he.json src/i18n/messages/en.json
git commit -m "feat(mirror): replace published_content with synced YouTube data + AI tone"
```

---

## Task 2.5: Phase 2 verification

- [ ] **Step 1: Type-check, lint, build**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 2: Tests pass**

```bash
npm run test:run
```

- [ ] **Step 3: Manual end-to-end**

1. With a connected channel, visit `/mirror` → verify videos appear with thumbnails
2. Verify dominant tone label shows
3. Verify activity hours render
4. Visit `/en/mirror` → English copy works

**Phase 2 done.**

---

# PHASE 3 — Analytics redesign + AI insights

Goal: `/analytics` shows real metrics from synced data, 3 comparison charts, growth-over-time, and Sonnet-generated insights bullets.

## Task 3.1: Update analytics queries

**Files:**
- Modify: `src/lib/analytics/queries.ts`
- Delete: `src/lib/analytics/actions.ts` (manual metric write actions)

- [ ] **Step 1: Read existing**

```bash
cat src/lib/analytics/queries.ts
```

- [ ] **Step 2: Replace queries**

```ts
import { createClient } from '@/lib/supabase/server';

export async function getAllSyncedVideos(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_videos')
    .select('*')
    .eq('user_id', userId)
    .order('published_at', { ascending: false });
  return data ?? [];
}

export async function getStatsHistory(userId: string, videoIds: string[]) {
  if (videoIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_video_stats_history')
    .select('video_id,snapshot_date,view_count,like_count,comment_count')
    .eq('user_id', userId)
    .in('video_id', videoIds)
    .order('snapshot_date', { ascending: true });
  const byVideo: Record<string, Array<{ date: string; views: number; likes: number; comments: number }>> = {};
  for (const r of data ?? []) {
    const arr = byVideo[r.video_id] ?? [];
    arr.push({
      date: r.snapshot_date,
      views: Number(r.view_count),
      likes: Number(r.like_count),
      comments: Number(r.comment_count),
    });
    byVideo[r.video_id] = arr;
  }
  return byVideo;
}

export function bucketByType(videos: any[]) {
  const shorts = videos.filter((v) => v.is_short);
  const longs = videos.filter((v) => !v.is_short);
  return {
    shorts: { count: shorts.length, avgViews: avg(shorts, 'view_count') },
    longs: { count: longs.length, avgViews: avg(longs, 'view_count') },
  };
}

export function bucketByTone(videos: any[]) {
  const map = new Map<string, { count: number; views: number }>();
  for (const v of videos) {
    const t = v.tone ?? 'unknown';
    const cur = map.get(t) ?? { count: 0, views: 0 };
    cur.count += 1;
    cur.views += Number(v.view_count);
    map.set(t, cur);
  }
  return [...map.entries()].map(([tone, m]) => ({
    tone,
    count: m.count,
    avgViews: m.count > 0 ? m.views / m.count : 0,
  }));
}

export function bucketByHour(videos: any[]) {
  const buckets: Array<{ hour: number; count: number; avgViews: number }> = [];
  for (let h = 0; h < 24; h++) {
    const inHour = videos.filter((v) => new Date(v.published_at).getHours() === h);
    buckets.push({
      hour: h,
      count: inHour.length,
      avgViews: avg(inHour, 'view_count'),
    });
  }
  return buckets;
}

function avg(rows: any[], field: string): number {
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + Number(r[field] ?? 0), 0) / rows.length;
}
```

- [ ] **Step 3: Delete the manual write actions**

```bash
git rm src/lib/analytics/actions.ts
```

(If there's no actions.ts, skip.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/analytics/queries.ts
git commit -m "feat(analytics): query synced YouTube data + drop manual writes"
```

---

## Task 3.2: AI insights generator

**Files:**
- Create: `src/lib/analytics/insights.ts`

- [ ] **Step 1: Implement**

```ts
import Anthropic from '@anthropic-ai/sdk';
import type { SyncedVideo, InsightsBullet } from '@/lib/youtube/types';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

export async function generateInsights(
  videos: SyncedVideo[],
  ideasContext: string
): Promise<InsightsBullet[]> {
  if (videos.length === 0) return [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  const client = new Anthropic({ apiKey });

  const recent = videos.slice(0, 30);
  const summary = recent
    .map(
      (v) =>
        `[${v.videoId}] "${v.title}" — ${v.isShort ? 'Short' : 'Long'} — ${new Date(
          v.publishedAt
        ).toISOString().slice(0, 10)} ${new Date(v.publishedAt).getHours()}:00 — views=${
          v.viewCount
        } likes=${v.likeCount} tone=${v.tone ?? '?'}`
    )
    .join('\n');

  const systemPrompt = `You analyze a content creator's last ~30 videos and surface 3-4
ACTIONABLE insights. Each insight is one short sentence (≤ 18 words) about what
performs well, what doesn't, and one concrete suggestion. No fluff. No hedging.

Output ONLY JSON:
[
  { "emoji": "🚀", "text": "Your Shorts average 3× the views of your long-form." },
  ...
]`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: `Recent videos:\n${summary}\n\nIdeas board context (titles only):\n${ideasContext}\n\nReturn 3-4 insights as JSON.`,
      },
    ],
  });

  const text = resp.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw);
  } catch {
    console.error('[insights] failed to parse JSON:', text);
    return [];
  }
}
```

- [ ] **Step 2: Wire into sync**

In `src/lib/youtube/sync.ts`, after the tone analysis block, add:

```ts
// Insights generation (cached on profile)
try {
  const { data: ideas } = await supabase
    .from('ideas')
    .select('content')
    .eq('user_id', userId)
    .limit(20);
  const ideasContext = (ideas ?? []).map((i: any) => `- ${i.content}`).join('\n');
  const insights = await generateInsights(videos, ideasContext);
  await supabase
    .from('profiles')
    .update({ youtube_insights_cache: insights })
    .eq('id', userId);
} catch (e: any) {
  console.error('[youtube.sync] insights failed:', e.message);
}
```

Add import:

```ts
import { generateInsights } from '@/lib/analytics/insights';
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/analytics/insights.ts src/lib/youtube/sync.ts
git commit -m "feat(analytics): AI insights generator wired into sync"
```

---

## Task 3.3: InsightsCard component

**Files:**
- Create: `src/components/analytics/InsightsCard.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { InsightsBullet } from '@/lib/youtube/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

export function InsightsCard({ bullets }: { bullets: InsightsBullet[] }) {
  const t = useTranslations('analytics');
  if (!bullets || bullets.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('insights')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="text-2xl leading-none">{b.emoji}</span>
              <span className="text-sm leading-relaxed">{b.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/analytics/InsightsCard.tsx
git commit -m "feat(analytics): InsightsCard component"
```

---

## Task 3.4: GrowthChart component

**Files:**
- Create: `src/components/analytics/GrowthChart.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

interface Series {
  videoId: string;
  title: string;
  points: Array<{ date: string; views: number }>;
}

export function GrowthChart({ series }: { series: Series[] }) {
  if (series.length === 0) return null;
  const allDates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const maxViews = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.views)));

  const width = 600;
  const height = 200;
  const xStep = allDates.length > 1 ? width / (allDates.length - 1) : width;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 bg-zinc-900/40 rounded">
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
        return <path key={s.videoId} d={path} stroke={`hsl(${hue},70%,60%)`} fill="none" strokeWidth={2} />;
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/analytics/GrowthChart.tsx
git commit -m "feat(analytics): GrowthChart sparkline component"
```

---

## Task 3.5: Analytics page rewrite

**Files:**
- Modify: `src/app/[locale]/analytics/page.tsx`
- Delete: `src/components/analytics/MetricsDialog.tsx`

- [ ] **Step 1: Replace page body**

```tsx
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/server';
import { syncUserYouTubeData } from '@/lib/youtube/sync';
import {
  getAllSyncedVideos,
  getStatsHistory,
  bucketByType,
  bucketByTone,
  bucketByHour,
} from '@/lib/analytics/queries';
import { YouTubeChannelInput } from '@/components/shared/YouTubeChannelInput';
import { InsightsCard } from '@/components/analytics/InsightsCard';
import { GrowthChart } from '@/components/analytics/GrowthChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in');

  const syncResult = await syncUserYouTubeData(user.id);
  if (syncResult.status === 'no-channel') {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Analytics</h1>
        <YouTubeChannelInput />
      </main>
    );
  }
  const banner =
    syncResult.status === 'quota-exceeded' ? 'Reached today\'s YouTube API limit. Showing cached data.' :
    syncResult.status === 'error' ? 'Could not refresh from YouTube. Showing last cached data.' :
    null;

  const [videos, profile] = await Promise.all([
    getAllSyncedVideos(user.id),
    supabase.from('profiles').select('youtube_insights_cache').eq('id', user.id).maybeSingle(),
  ]);

  const top5Ids = [...videos].sort((a, b) => Number(b.view_count) - Number(a.view_count)).slice(0, 5).map((v) => v.video_id);
  const history = await getStatsHistory(user.id, top5Ids);
  const series = top5Ids.map((id) => ({
    videoId: id,
    title: videos.find((v) => v.video_id === id)?.title ?? '',
    points: history[id] ?? [],
  }));

  const byType = bucketByType(videos);
  const byTone = bucketByTone(videos);
  const byHour = bucketByHour(videos);
  const insights = (profile.data?.youtube_insights_cache as any[]) ?? [];

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {banner && (
        <div className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
          {banner}
        </div>
      )}

      <InsightsCard bullets={insights} />

      <Card>
        <CardHeader><CardTitle>Top 5 — growth over time</CardTitle></CardHeader>
        <CardContent>
          <GrowthChart series={series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>By type</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div>Shorts: {byType.shorts.count} avg views {Math.round(byType.shorts.avgViews)}</div>
            <div>Long-form: {byType.longs.count} avg views {Math.round(byType.longs.avgViews)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>By tone</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {byTone.sort((a, b) => b.avgViews - a.avgViews).map((b) => (
              <li key={b.tone}>{b.tone}: {b.count} videos, avg views {Math.round(b.avgViews)}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>By hour</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-px">
            {byHour.map((b) => (
              <div key={b.hour} className="flex-1 bg-orange-500/40 rounded-t" style={{ height: `${b.avgViews / 1000}px` }} title={`${b.hour}:00`} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All videos</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th>Title</th><th>Views</th><th>Likes</th><th>Comments</th></tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.video_id} className="border-t border-zinc-800">
                  <td className="py-2 pr-2 truncate max-w-md">{v.title}</td>
                  <td>{Number(v.view_count).toLocaleString()}</td>
                  <td>{Number(v.like_count).toLocaleString()}</td>
                  <td>{Number(v.comment_count).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Delete the metrics dialog**

```bash
git rm src/components/analytics/MetricsDialog.tsx
```

- [ ] **Step 3: Add i18n key**

`he.json`: `"analytics": { "insights": "תובנות AI" }`
`en.json`: `"analytics": { "insights": "AI insights" }`

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Visit `/analytics` with a connected channel. Verify all sections render with real data. Reload — should be instant (cache hit).

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/analytics/page.tsx" src/i18n/messages/he.json src/i18n/messages/en.json
git commit -m "feat(analytics): rewrite page with synced data + insights + growth chart"
```

---

## Task 3.6: Phase 3 verification

- [ ] **Step 1: Type-check, lint, build, tests**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm run test:run
```

- [ ] **Step 2: Manual verification**

1. `/analytics` shows AI bullets at top
2. Growth chart renders for top 5 videos
3. By type / tone / hour all visible
4. Full table at bottom

**Phase 3 done.**

---

# PHASE 4 — Style Swipes redesign

Goal: single `/swipe` page combining categories + tracked creators, swipe mechanics intact.

## Task 4.1: Curated channels in creators.config.ts

**Files:**
- Modify: `src/config/creators.config.ts`

- [ ] **Step 1: Read existing**

```bash
cat src/config/creators.config.ts
```

- [ ] **Step 2: Extend with SHORTS_CATEGORIES**

Append:

```ts
import type { ShortsCategoryConfig } from '@/types';

// Channels to be resolved to UCxxxx + uploads playlist during a one-time setup.
// To resolve a handle: https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@AliAbdaal&key=YOUR_KEY
// uploads playlist is `UU` + channelId.slice(2)
export const SHORTS_CATEGORIES: ShortsCategoryConfig[] = [
  {
    id: 'productivity',
    label: { he: 'פרודוקטיביות', en: 'Productivity' },
    channels: [
      { handle: '@AliAbdaal', channelId: 'UCoOae5nYA7VqaXzerajD0lg', uploadsPlaylist: 'UUoOae5nYA7VqaXzerajD0lg' },
      { handle: '@MattDAvella', channelId: 'UCJ24N4O0bP7LGLBDvye7oCA', uploadsPlaylist: 'UUJ24N4O0bP7LGLBDvye7oCA' },
      { handle: '@ThomasFrank', channelId: 'UCG-KntY7aVnIGXYEBQvmBAQ', uploadsPlaylist: 'UUG-KntY7aVnIGXYEBQvmBAQ' },
      // Add 2 more handles + resolve their channelIds
    ],
  },
  // Add 4 more categories here, mirroring the existing `LearnCategory` taxonomy
  // (creator-mindset, fitness, business, storytelling, comedy — pick 4-5)
];
```

> Note: the channelIds shown are best-effort guesses. Resolve them properly using a one-off curl call before relying on them. The implementation pattern is what matters.

- [ ] **Step 3: Commit**

```bash
git add src/config/creators.config.ts
git commit -m "feat(config): SHORTS_CATEGORIES with curated channels per niche"
```

---

## Task 4.2: Shorts feed module (TDD on the merge logic)

**Files:**
- Create: `tests/lib/swipes/shorts-feed.test.ts`
- Create: `src/lib/swipes/shorts-feed.ts`

- [ ] **Step 1: Test the dedupe + shuffle stability**

```ts
import { describe, it, expect } from 'vitest';
import { mergeAndDedupe, deterministicShuffle } from '@/lib/swipes/shorts-feed';

const v = (id: string) => ({ videoId: id, title: id, thumbnailUrl: '', channelTitle: '' });

describe('mergeAndDedupe', () => {
  it('removes duplicate video IDs', () => {
    const out = mergeAndDedupe([v('a'), v('b'), v('a')]);
    expect(out.map((x) => x.videoId)).toEqual(['a', 'b']);
  });
});

describe('deterministicShuffle', () => {
  it('is stable for the same seed', () => {
    const a = deterministicShuffle([v('1'), v('2'), v('3'), v('4')], 'seed-x');
    const b = deterministicShuffle([v('1'), v('2'), v('3'), v('4')], 'seed-x');
    expect(a.map((x) => x.videoId)).toEqual(b.map((x) => x.videoId));
  });

  it('produces different orders for different seeds', () => {
    const a = deterministicShuffle([v('1'), v('2'), v('3'), v('4')], 'seed-x');
    const b = deterministicShuffle([v('1'), v('2'), v('3'), v('4')], 'seed-y');
    expect(a.map((x) => x.videoId)).not.toEqual(b.map((x) => x.videoId));
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
npm run test:run -- shorts-feed
```

- [ ] **Step 3: Implement**

```ts
import type { SyncedVideo } from '@/lib/youtube/types';
import { listUploadsPlaylist, fetchVideoDetails } from '@/lib/youtube/videos';

export interface ShortCard {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
}

export function mergeAndDedupe(items: ShortCard[]): ShortCard[] {
  const seen = new Set<string>();
  const out: ShortCard[] = [];
  for (const i of items) {
    if (seen.has(i.videoId)) continue;
    seen.add(i.videoId);
    out.push(i);
  }
  return out;
}

// Mulberry32-based PRNG seeded from a string
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = h >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  const rand = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Pull Shorts from a list of uploads playlists, return cards
export async function fetchShortsFromPlaylists(
  uploadsPlaylistIds: string[],
  perPlaylist = 10
): Promise<ShortCard[]> {
  const all: ShortCard[] = [];
  for (const pid of uploadsPlaylistIds) {
    const ids = await listUploadsPlaylist(pid, perPlaylist);
    if (ids.length === 0) continue;
    const details = await fetchVideoDetails(ids);
    for (const d of details) {
      if (!d.isShort) continue;
      all.push({
        videoId: d.videoId,
        title: d.title,
        thumbnailUrl: d.thumbnailUrl,
        channelTitle: '', // filled later if needed
      });
    }
  }
  return all;
}
```

- [ ] **Step 4: Tests pass**

```bash
npm run test:run -- shorts-feed
```

- [ ] **Step 5: Commit**

```bash
git add tests/lib/swipes/shorts-feed.test.ts src/lib/swipes/shorts-feed.ts
git commit -m "feat(swipes): shorts-feed merge/dedupe/shuffle + playlist fetcher"
```

---

## Task 4.3: Server actions for tracked creators + categories

**Files:**
- Create: `src/lib/swipes/tracked-creators.ts`
- Create: `src/lib/swipes/categories.ts`

- [ ] **Step 1: tracked-creators.ts**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseChannelInput } from '@/lib/youtube/parse-url';
import { resolveChannel } from '@/lib/youtube/channels';

export async function addTrackedCreator(formData: FormData) {
  const raw = String(formData.get('channel_url') ?? '').trim();
  if (!raw) return { ok: false as const, error: 'Empty input' };

  let resolved;
  try {
    resolved = await resolveChannel(parseChannelInput(raw));
  } catch (e: any) {
    return { ok: false as const, error: 'Could not resolve channel' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  const { error } = await supabase.from('tracked_creators').upsert({
    user_id: user.id,
    channel_id: resolved.channelId,
    channel_url: raw,
    channel_title: resolved.title,
    uploads_playlist: resolved.uploadsPlaylistId,
    thumbnail_url: resolved.thumbnailUrl,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/[locale]/swipe', 'page');
  return { ok: true as const };
}

export async function removeTrackedCreator(formData: FormData) {
  const channelId = String(formData.get('channel_id') ?? '');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  await supabase
    .from('tracked_creators')
    .delete()
    .eq('user_id', user.id)
    .eq('channel_id', channelId);

  revalidatePath('/[locale]/swipe', 'page');
  return { ok: true as const };
}

export async function listTrackedCreators(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tracked_creators')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  return data ?? [];
}
```

- [ ] **Step 2: categories.ts**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function toggleShortsCategory(formData: FormData) {
  const categoryId = String(formData.get('category_id') ?? '');
  const action = String(formData.get('action') ?? 'add');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  if (action === 'remove') {
    await supabase
      .from('shorts_categories')
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId);
  } else {
    await supabase
      .from('shorts_categories')
      .upsert({ user_id: user.id, category_id: categoryId });
  }
  revalidatePath('/[locale]/swipe', 'page');
  return { ok: true as const };
}

export async function listSelectedCategories(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shorts_categories')
    .select('category_id')
    .eq('user_id', userId);
  return (data ?? []).map((r: any) => r.category_id);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/swipes/tracked-creators.ts src/lib/swipes/categories.ts
git commit -m "feat(swipes): server actions for tracked creators + categories"
```

---

## Task 4.4: CategoriesPanel + TrackedCreatorsPanel components

**Files:**
- Create: `src/components/swipes/CategoriesPanel.tsx`
- Create: `src/components/swipes/TrackedCreatorsPanel.tsx`

- [ ] **Step 1: CategoriesPanel.tsx**

```tsx
'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { toggleShortsCategory } from '@/lib/swipes/categories';
import type { ShortsCategoryConfig } from '@/types';

interface Props {
  categories: ShortsCategoryConfig[];
  active: string[];
}

export function CategoriesPanel({ categories, active }: Props) {
  const locale = useLocale() as 'he' | 'en';
  const [, start] = useTransition();
  const set = new Set(active);

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const on = set.has(c.id);
        return (
          <form
            key={c.id}
            action={(fd) => {
              fd.set('category_id', c.id);
              fd.set('action', on ? 'remove' : 'add');
              start(() => { toggleShortsCategory(fd); });
            }}
          >
            <button
              type="submit"
              className={`px-3 py-1.5 rounded-full text-sm border ${
                on ? 'bg-violet-500/20 border-violet-400' : 'border-zinc-700'
              }`}
            >
              {c.label[locale]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: TrackedCreatorsPanel.tsx**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { addTrackedCreator, removeTrackedCreator } from '@/lib/swipes/tracked-creators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Creator {
  channel_id: string;
  channel_title: string;
  thumbnail_url: string | null;
}

export function TrackedCreatorsPanel({ creators }: { creators: Creator[] }) {
  const t = useTranslations('swipes');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <form
        action={(fd) => {
          setError(null);
          start(async () => {
            const r = await addTrackedCreator(fd);
            if (!r.ok) setError(r.error);
          });
        }}
        className="flex gap-2"
      >
        <Input name="channel_url" placeholder="https://youtube.com/@creator" required disabled={pending} />
        <Button type="submit" disabled={pending}>{t('add_creator')}</Button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <ul className="divide-y divide-zinc-800">
        {creators.map((c) => (
          <li key={c.channel_id} className="flex items-center gap-3 py-2">
            <img src={c.thumbnail_url ?? ''} alt="" className="w-8 h-8 rounded-full" />
            <span className="flex-1 truncate">{c.channel_title}</span>
            <form
              action={(fd) => {
                fd.set('channel_id', c.channel_id);
                start(() => { removeTrackedCreator(fd); });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">×</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Add i18n keys**

`he.json` `swipes`: `"add_creator": "הוסף יוצר"`
`en.json` `swipes`: `"add_creator": "Add creator"`

- [ ] **Step 4: Commit**

```bash
git add src/components/swipes/CategoriesPanel.tsx src/components/swipes/TrackedCreatorsPanel.tsx src/i18n/messages/he.json src/i18n/messages/en.json
git commit -m "feat(swipes): CategoriesPanel + TrackedCreatorsPanel UI"
```

---

## Task 4.5: Unified /swipe page

**Files:**
- Modify: `src/app/[locale]/swipe/page.tsx`

- [ ] **Step 1: Replace contents**

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listTrackedCreators } from '@/lib/swipes/tracked-creators';
import { listSelectedCategories } from '@/lib/swipes/categories';
import { fetchShortsFromPlaylists, mergeAndDedupe, deterministicShuffle } from '@/lib/swipes/shorts-feed';
import { SHORTS_CATEGORIES } from '@/config/creators.config';
import { CategoriesPanel } from '@/components/swipes/CategoriesPanel';
import { TrackedCreatorsPanel } from '@/components/swipes/TrackedCreatorsPanel';
import { YouTubeChannelInput } from '@/components/shared/YouTubeChannelInput';
import { ShortsDeck } from '@/components/swipes/ShortsDeck';

const PAGE_SIZE = 20;

export default async function SwipePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('youtube_channel_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.youtube_channel_id) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Style Swipes</h1>
        <YouTubeChannelInput />
      </main>
    );
  }

  const [activeCats, creators] = await Promise.all([
    listSelectedCategories(user.id),
    listTrackedCreators(user.id),
  ]);

  // Build playlist list: from categories + tracked creators
  const playlistIds: string[] = [];
  for (const c of SHORTS_CATEGORIES) {
    if (activeCats.includes(c.id)) {
      for (const ch of c.channels) playlistIds.push(ch.uploadsPlaylist);
    }
  }
  for (const c of creators) playlistIds.push(c.uploads_playlist);

  let cards = await fetchShortsFromPlaylists(playlistIds, 10);
  cards = mergeAndDedupe(cards);

  const today = new Date().toISOString().slice(0, 10);
  const seed = `${user.id}:${today}`;
  cards = deterministicShuffle(cards, seed).slice(0, PAGE_SIZE);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Style Swipes</h1>
      <CategoriesPanel categories={SHORTS_CATEGORIES} active={activeCats} />
      <TrackedCreatorsPanel creators={creators} />
      {cards.length === 0 ? (
        <p className="text-muted-foreground">Pick a category or add a creator to get started.</p>
      ) : (
        <ShortsDeck cards={cards} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Create ShortsDeck**

```tsx
// src/components/swipes/ShortsDeck.tsx
'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { ShortCard } from '@/lib/swipes/shorts-feed';

export function ShortsDeck({ cards }: { cards: ShortCard[] }) {
  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const card = cards[index];
  if (!card) return <p>Done for today!</p>;

  return (
    <div className="relative h-[480px] flex justify-center items-center">
      <motion.div
        key={card.videoId}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x, rotate }}
        onDragEnd={async (_, info) => {
          if (Math.abs(info.offset.x) > 100) {
            const liked = info.offset.x > 0;
            // Persist to existing swipe_items table (preserve schema)
            await fetch('/api/swipes/decision', {
              method: 'POST',
              body: JSON.stringify({
                video_id: card.videoId,
                title: card.title,
                thumbnail_url: card.thumbnailUrl,
                decision: liked ? 'liked' : 'skipped',
              }),
            });
            setIndex((i) => i + 1);
          }
        }}
        className="w-72 h-[400px] rounded-lg overflow-hidden bg-zinc-900 shadow-xl"
      >
        <img src={card.thumbnailUrl} alt={card.title} className="w-full h-2/3 object-cover" />
        <div className="p-3">
          <p className="text-sm line-clamp-2">{card.title}</p>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Create the decision API route**

```ts
// src/app/api/swipes/decision/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  await supabase.from('swipe_items').insert({
    user_id: user.id,
    category: 'videos', // existing enum value
    source_url: `https://youtube.com/shorts/${body.video_id}`,
    platform: 'other',
    thumbnail_url: body.thumbnail_url,
    title: body.title,
    decision: body.decision,
    decided_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

`/swipe` → toggle a category → cards appear → swipe right → check `swipe_items` table for the entry.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/swipe/page.tsx" src/components/swipes/ShortsDeck.tsx "src/app/api/swipes/decision/route.ts"
git commit -m "feat(swipes): unified /swipe with categories + tracked creators + Shorts deck"
```

---

## Task 4.6: Phase 4 verification

- [ ] **Step 1: Build + tests**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm run test:run
```

- [ ] **Step 2: Manual**

1. `/swipe` shows categories panel
2. Toggling a category triggers a fetch (first time slow, cached after)
3. Adding a tracked creator works
4. Swiping right → liked entry in DB

**Phase 4 done.**

---

# PHASE 5 — Removals + cleanup

Goal: dead code gone, build clean, i18n free of orphans.

## Task 5.1: Delete the old swipe pages and OG infrastructure

- [ ] **Step 1: Remove**

```bash
git rm -r "src/app/[locale]/swipe/edit" "src/app/[locale]/swipe/photos" "src/app/api/swipes/og" src/lib/swipes/og-fetch.ts src/components/swipes/AddLinkForm.tsx
```

(If any path doesn't exist — skip with no error.)

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove old swipe pages and OG fetcher"
```

---

## Task 5.2: Delete the publish flow

- [ ] **Step 1: Remove**

```bash
git rm -r src/lib/publish src/components/publish
```

- [ ] **Step 2: Find and remove "Mark as Published" usages**

```bash
git grep -l "PublishDialog\|markAsPublished" -- "src/**"
```

For each match: open the file, remove the import + the usage. Most likely it's in `src/components/ideas/IdeaCard.tsx`.

Example for IdeaCard:

```tsx
// Remove:
// import { PublishDialog } from '@/components/publish/PublishDialog';
// <PublishDialog idea={idea} />
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Mark-as-Published flow"
```

---

## Task 5.3: Remove nav entries for old swipe pages

**Files:**
- Modify: `src/components/layout/NavBar.tsx` (or wherever nav items live)

- [ ] **Step 1: Find usages**

```bash
git grep -n "/swipe/edit\|/swipe/photos" -- "src/**"
```

- [ ] **Step 2: For each match**

Replace any list of `[ '/swipe/videos', '/swipe/edit', '/swipe/photos' ]` with just `'/swipe'`. Remove the nav items for `/swipe/edit` and `/swipe/photos`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: collapse swipe nav to single entry"
```

---

## Task 5.4: Clean dead i18n keys

- [ ] **Step 1: Identify dead keys**

```bash
git grep -l "publish_dialog\|mark_published\|add_metrics" -- src/i18n/
```

Open each `he.json` / `en.json` and remove keys for:
- Anything related to `publish` / "Mark as Published"
- Anything in `analytics` related to manual metric entry (`add_metrics`, `metric_dialog_*`)
- Anything related to `swipe.edit_*`, `swipe.photos_*`

- [ ] **Step 2: Verify nothing references the removed keys**

```bash
git grep -l "publish_dialog\|mark_published\|add_metrics" -- "src/**"
```

Should return empty. If any remain, remove them.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/messages/
git commit -m "chore(i18n): remove dead keys for publish + manual metrics + old swipe pages"
```

---

## Task 5.5: PWA manifest cleanup

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Open manifest**

```bash
cat public/manifest.json
```

- [ ] **Step 2: Remove shortcuts pointing to removed pages**

In the `shortcuts` array, remove any entry whose `url` is `/swipe/edit` or `/swipe/photos`. Keep ones for `/ideas/new`, `/analyze`, `/mirror`.

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json
git commit -m "chore(pwa): remove shortcuts for deleted swipe pages"
```

---

## Task 5.6: Remove "Mark as Published" from IdeaCard if not already

This may have been done in 5.2; double-check.

- [ ] **Step 1: Open IdeaCard**

```bash
cat src/components/ideas/IdeaCard.tsx
```

- [ ] **Step 2: If a "publish" button is still there, remove it**

- [ ] **Step 3: Commit if changed**

```bash
git add src/components/ideas/IdeaCard.tsx
git commit -m "chore(ideas): remove orphaned Mark-as-Published button"
```

---

## Task 5.7: Final verification

- [ ] **Step 1: Full build pipeline**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm run test:run
```

Expected: zero errors, zero warnings, tests pass.

- [ ] **Step 2: End-to-end manual sweep**

In a fresh incognito window:
1. Sign in
2. Connect channel via Settings
3. Visit `/mirror` → real data
4. Visit `/analytics` → AI insights, charts, data
5. Visit `/swipe` → categories + creators, swipe a card
6. Visit `/copy`, `/analyze`, `/learn`, `/ideas` — all still work
7. Switch locale — all bilingual
8. Check 404s on `/swipe/edit` and `/swipe/photos`

- [ ] **Step 3: Commit closer**

```bash
git commit --allow-empty -m "feat: YouTube channel link redesign complete"
```

**Phase 5 done. Plan complete.**

---

## Self-review notes

- Spec coverage: every section in the spec is implemented in tasks. Mirror (§5.1) → Phase 2. Analytics (§5.2) → Phase 3. Style Swipes (§5.3) → Phase 4. Removals (§6) → Phase 5. Schema (§4.3) → Task 1.2. Quota guardrail (§7.3) → Task 1.5 + 1.8.
- Type consistency: `SyncedVideo`, `SyncResult`, `ToneAnalysis`, `InsightsBullet`, `TrackedCreator`, `ShortsCategoryConfig` all defined once in Task 1.3, consumed everywhere.
- No placeholders in code blocks. Channel handles in `creators.config.ts` need real `channelId` resolution before that task ships — that's noted explicitly as a one-time setup, not a runtime placeholder.
- Open: the existing `swipe_items` table has `category IN ('videos', 'edit_styles', 'photos')` — we keep `'videos'` and stop writing the other two values. That's fine for the migration; old rows with `edit_styles`/`photos` stay valid in DB, just unread.
