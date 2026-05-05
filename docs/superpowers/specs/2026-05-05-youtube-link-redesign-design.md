# Spec — YouTube Channel Link Redesign

**Date:** 2026-05-05
**Status:** Draft, pending user approval
**Project:** Creator Mode (`אפליקציית תוכן`)
**Supersedes:** Manual "Mark as Published" workflow + manual metric entry in Analytics

---

## 1. Summary

Replace the originally-planned "connect with Google" concept with a single paste-a-YouTube-channel-URL flow. The link drives auto-population of Weekly Mirror and Analytics, and powers a redesigned single-page Style Swipes (Shorts feed). Three swipe pages collapse to one; "Mark as Published" and manual metric entry are removed; Mirror, Analytics, and Video Analyzer remain on the highest-quality model (Sonnet 4.6) as the headline features. Single-tenant cost lands at ~$7–11/user/month, well under the existing $50 AI cap.

## 2. Motivation

The current app design assumes the user manually marks every published item and types in metrics. That's friction for what is supposed to be a low-overhead "thinking tool." A YouTube channel link lets the app pull videos + stats automatically and feed them into the three headline features:

- **Weekly Mirror** — auto-aggregated, with AI tone analysis
- **Analytics** — auto-pulled metrics + AI insights summary
- **Video Analyzer** — unchanged input flow, but now sits next to features that actually understand the user's channel

Instagram and TikTok are explicitly out of scope. Neither platform exposes profile-level data without OAuth (and Business-account requirements on IG, Display API approval on TikTok). Matching the YouTube experience there would triple the integration surface for a single-user mindset tool.

## 3. Scope

### In scope

- New "YouTube channel URL" field in `/settings`
- Inline empty-state input on `/mirror`, `/analytics`, `/swipe` that writes to the same profile field
- 24h-cached auto-sync of channel videos + stats (on-page-load pattern, mirroring the existing Learn Library cache)
- Weekly Mirror redesign — auto-aggregated from synced data, AI tone analysis on Sonnet 4.6
- Analytics redesign — auto-pulled metrics + 30-day growth chart + AI insights summary on Sonnet 4.6
- Style Swipes redesign — single page, curated channel buckets per category + user-tracked creators, Shorts only
- Removal of `/swipe/edit` and `/swipe/photos` pages and supporting components/routes
- Removal of "Mark as Published" + manual metric entry UIs
- Schema additions: 4 new tables, 6 new columns on `profiles`
- YouTube quota guardrail mirroring the existing AI budget guardrail
- Localized error/empty-state copy in `he` + `en`

### Out of scope

- Instagram / TikTok integration (deferred indefinitely)
- OAuth-based YouTube Analytics (private metrics like watch time, audience retention)
- Background cron syncing (using on-page-load with 24h cache instead)
- Pro tier / billing
- Migration of existing `published_content` rows (they stay in the DB but are no longer written or read; cleanup deferred)
- Multi-tenant scaling beyond the ~300 active-users-per-day ceiling that a single YouTube API key supports

## 4. Architecture

### 4.1 Channel link plumbing

**UI placement:**
- Primary: `/settings` — new field "YouTube channel URL" placed above the push toggle
- Secondary: inline empty-state input on `/mirror`, `/analytics`, `/swipe` — same server action, paste & save without redirect

**Accepted formats:**
- `https://youtube.com/@handle`
- `https://youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx`
- `https://youtube.com/c/customname`
- bare `@handle`

**Save flow (`setYouTubeChannel(input: string)` server action):**
1. Normalize the input into a query for `channels.list` — `forHandle=` for `@handle` / `c/`, `id=` for `channel/UC…`
2. Call YouTube `channels.list` (1 quota unit) with `part=snippet,contentDetails`
3. On success, persist on `profiles`: `youtube_channel_url` (raw input), `youtube_channel_id` (UCxxxx), `youtube_uploads_playlist_id`, `youtube_channel_title`, `youtube_channel_thumbnail`
4. On failure, return localized error: "Couldn't find that channel. Check the URL?" / "לא הצלחנו למצוא את הערוץ הזה. לבדוק את הקישור?"

**Save with empty input (clear the link):**
- Wipe the same five `profiles` columns to NULL
- Delete this user's rows from `youtube_videos` and `youtube_video_stats_history`
- Reset `youtube_synced_at` to NULL

### 4.2 Sync layer

**New file: `src/lib/youtube/sync.ts`**

Exports `syncUserYouTubeData(userId: string, force?: boolean): Promise<SyncResult>` returning one of:
- `{ status: 'no-channel' }`
- `{ status: 'cached', age: number }`
- `{ status: 'quota-exceeded' }`
- `{ status: 'synced', videoCount: number }`
- `{ status: 'error', message: string }`

Algorithm:
1. Read user's `youtube_channel_id`, `youtube_uploads_playlist_id`, `youtube_synced_at` from `profiles`
2. If no channel ID → return `no-channel`
3. If `youtube_synced_at` is < 24h ago and `!force` → return `cached`
4. If today's quota counter > 8000 units → return `quota-exceeded` (callers serve last cache)
5. Call `playlistItems.list?playlistId={uploads}&maxResults=50&part=contentDetails` (1 unit)
6. Call `videos.list?id={50 ids}&part=snippet,contentDetails,statistics` (1 unit)
7. Upsert each video into `youtube_videos`. Compute `is_short = duration_seconds <= 60 OR description ~* '#shorts'`
8. For each video, INSERT into `youtube_video_stats_history` with today's `snapshot_date` (`ON CONFLICT DO NOTHING`)
9. Update `profiles.youtube_synced_at = now()`
10. Increment `youtube_quota_daily.units_used` by 2
11. Return `synced`

Called from server components on `/mirror`, `/analytics`, `/swipe` page load. Called with `force=true` from a "Refresh now" button visible only when last sync > 1h old (avoids spam).

### 4.3 Schema deltas

```sql
-- Profiles: 6 new columns
ALTER TABLE profiles
  ADD COLUMN youtube_channel_url         text,
  ADD COLUMN youtube_channel_id          text,
  ADD COLUMN youtube_uploads_playlist_id text,
  ADD COLUMN youtube_channel_title       text,
  ADD COLUMN youtube_channel_thumbnail   text,
  ADD COLUMN youtube_synced_at           timestamptz;

-- Cached video table (Mirror + Analytics + Style Swipes share this)
CREATE TABLE youtube_videos (
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id         text NOT NULL,
  title            text NOT NULL,
  description      text,
  published_at     timestamptz NOT NULL,
  duration_seconds int NOT NULL,
  view_count       bigint NOT NULL DEFAULT 0,
  like_count       bigint NOT NULL DEFAULT 0,
  comment_count    bigint NOT NULL DEFAULT 0,
  thumbnail_url    text,
  is_short         boolean NOT NULL DEFAULT false,
  tone             text,             -- AI-classified at sync time, used by Mirror + Analytics
  synced_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX youtube_videos_user_published_idx ON youtube_videos (user_id, published_at DESC);
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see only their videos" ON youtube_videos
  FOR ALL USING (auth.uid() = user_id);

-- Daily snapshots for the growth-over-time chart
CREATE TABLE youtube_video_stats_history (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id       text NOT NULL,
  snapshot_date  date NOT NULL,
  view_count     bigint NOT NULL,
  like_count     bigint NOT NULL,
  comment_count  bigint NOT NULL,
  PRIMARY KEY (video_id, snapshot_date)
);
CREATE INDEX yt_stats_user_date_idx ON youtube_video_stats_history (user_id, snapshot_date DESC);
ALTER TABLE youtube_video_stats_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see only their history" ON youtube_video_stats_history
  FOR ALL USING (auth.uid() = user_id);

-- Style Swipes — Source A (categories the user opted into)
CREATE TABLE shorts_categories (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  text NOT NULL,
  PRIMARY KEY (user_id, category_id)
);
ALTER TABLE shorts_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their categories" ON shorts_categories
  FOR ALL USING (auth.uid() = user_id);

-- Style Swipes — Source B (specific creators the user wants to study)
CREATE TABLE tracked_creators (
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id       text NOT NULL,
  channel_url      text NOT NULL,
  channel_title    text NOT NULL,
  uploads_playlist text NOT NULL,
  thumbnail_url    text,
  added_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);
ALTER TABLE tracked_creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their creators" ON tracked_creators
  FOR ALL USING (auth.uid() = user_id);

-- Daily YouTube quota counter
CREATE TABLE youtube_quota_daily (
  date        date PRIMARY KEY,
  units_used  int NOT NULL DEFAULT 0
);
```

### 4.4 Curated category config

Extend `src/config/creators.config.ts` so each category has a hand-picked list of channel handles instead of a free-text search query:

```ts
export const SHORTS_CATEGORIES: Record<string, {
  label: { he: string; en: string };
  channels: string[]; // YouTube @handles, ~5 per category
}> = {
  productivity: {
    label: { he: 'פרודוקטיביות', en: 'Productivity' },
    channels: ['@AliAbdaal', '@MattDAvella', '@ThomasFrank', '@StruthlessOfficial', '@Productive'],
  },
  // ... 4 more categories matching the existing Learn Library taxonomy
};
```

The handles are placeholders; final selection happens during implementation. Constraint: each category has 4–6 channels, all of which actively post Shorts.

## 5. Feature changes

### 5.1 Weekly Mirror (`/mirror`)

Reads from `youtube_videos` filtered by `published_at >= now() - interval '7 days'`. Existing UI components stay; data source changes.

**UI sections — unchanged in shape, new in source:**
- Posts this week — count + thumbnail strip from `youtube_videos`
- Activity hours histogram — bucketed by `EXTRACT(hour FROM published_at)`
- Drafts list — local `ideas` table (no change)
- Undeveloped ideas — `ideas` (no change)
- Liked styles — `style_likes` (no change)

**Updated section — Dominant tone (Sonnet 4.6):**
- One AI call per sync classifies every video pulled in steps 5–7 of the sync algorithm — input is the full list of titles + descriptions, output is `{ video_id → tone }` plus an aggregate `{ dominantTone, rationale }` for the week
- Per-video tones are written to `youtube_videos.tone` and reused by the Analytics "by tone" chart (one AI call serves both features)
- Aggregate week-level tone is cached on a new `profiles.youtube_tone_cache` JSONB column until the next sync
- Heavy use of Anthropic prompt caching (system prompt + user identity stay cached)

**Empty states:**
- No channel link → inline paste form (shared server action with Settings)
- Channel linked but 0 videos this week → "No new uploads this week — what are you cooking?" / "אין העלאות חדשות השבוע — על מה עובדים?"

### 5.2 Analytics (`/analytics`)

Reads from `youtube_videos` + `youtube_video_stats_history`.

**Per-video table — 3 metrics:**
- Views, Likes, Comments (sortable, with thumbnail + title)
- Manual columns from the old design (Shares, Saves, Watch time) are **removed** — public YouTube API doesn't expose them, and the old manual workflow is gone

**3 comparison charts (kept):**
- By type — Short vs long-form (`is_short`)
- By tone — joined to `youtube_videos.tone` (populated by the same AI call used for the Mirror tone widget)
- By hour-of-day — from `published_at`

**New: Growth-over-time chart**
- Per-video sparkline of view count over the last 30 days, from `youtube_video_stats_history`
- Default view: top 5 videos by total views, with a "show all" expander

**New: AI Insights summary (Sonnet 4.6, top of page):**
- 3–4 bullet narrative recomputed each sync
- Examples of what it should produce: *"Your last 4 Shorts averaged 3× the views of your long-form. Tuesday 19:00 is your strongest publishing slot. Hook pattern 'question + number' shows up in 5 of your top 10. Try doubling down on it next week."*
- Prompt input: last 30 videos with their stats + relevant rows from `ideas` for tone/hook context
- Heavy prompt caching — system prompt + user identity layer kept stable
- Cached on a new `profiles.youtube_insights_cache` JSONB column until the next sync
- Estimated cost: ~$0.10/sync × ~30 syncs/month = ~$3/user/month

**Empty state:** inline paste form (same component as Mirror).

### 5.3 Style Swipes (`/swipe`)

Single page replaces three. Two sources merged into one deck.

**Source A — Categories (default):**
- Top panel: chips for each entry in `SHORTS_CATEGORIES`. User toggles which categories are active. Selections persist in `shorts_categories`.
- The static config stores each channel as `{ handle, channelId, uploadsPlaylistId }` — resolved once during implementation, hardcoded thereafter (uploads playlist ID is just `'UU' + channelId.slice(2)` per the YouTube convention, but we keep it explicit to avoid surprises)
- Fetcher: for each selected category → for each channel → call `playlistItems.list?playlistId={uploads}&maxResults=10` (1 unit each)
- Filter results: keep only items whose `videos.list` lookup confirms `duration <= 60s` (one batch `videos.list` call per category, 1 unit, covers all candidates)
- Cache: 24h TTL, keyed by `(category_id, calendar_day)`

**Source B — Tracked creators (optional):**
- Sidebar/drawer panel "Creators I'm watching"
- Add flow: paste channel URL or `@handle` → resolve via `channels.list` (1 unit) → store in `tracked_creators` with `uploads_playlist` already resolved
- Remove flow: trash icon per row, soft-confirms first
- Fetcher per tracked creator: `playlistItems.list` on their uploads playlist → filter to Shorts (1 unit each)
- Cache: 24h TTL, keyed by `(channel_id, calendar_day)`

**Deck merge:**
- Server-side: merge both pools, dedupe by `videoId`, deterministic shuffle by `(user_id, calendar_day)`, paginate 20 cards at a time
- Card UI: thumbnail + title + channel handle. Tap → in-place YouTube `<iframe>` embed
- Existing swipe mechanics unchanged: Framer Motion drag, ✕/♥ overlay labels, ←/→ keyboard, Z to undo, optimistic UI, IndexedDB queue persistence
- Likes write to existing `style_likes` table → continue feeding the AI agents (no change)

**Empty states:**
- No channel link → inline paste form (matches Mirror/Analytics)
- Channel linked but no categories selected and no tracked creators → "Pick a category to get started, or add a creator you want to study." / "בחר קטגוריה כדי להתחיל, או הוסף יוצר שאתה רוצה ללמוד ממנו."

## 6. Removals

### 6.1 Pages
- `src/app/[locale]/swipe/edit/`
- `src/app/[locale]/swipe/photos/`

### 6.2 Components
- `src/components/swipes/AddLinkForm.tsx`
- `src/components/publish/PublishDialog.tsx`
- `src/components/analytics/MetricsDialog.tsx`

### 6.3 API routes
- `src/app/api/swipes/og/`

### 6.4 Lib
- `src/lib/swipes/og.ts` (OG metadata fetcher)
- `src/lib/publish/` (entire directory — `markAsPublished` action and supporting types)
- Manual-metric write actions in `src/lib/analytics/` (e.g. `addMetricSnapshot`). Read queries that no longer have any data path are also removed; only queries reading from `youtube_videos` / `youtube_video_stats_history` remain.

### 6.5 UI affordances
- "Mark as Published" button on every IdeaCard
- "+ Add metrics" button on the Analytics page
- NavBar + sidebar entries for `/swipe/edit` and `/swipe/photos`
- FAB shortcut entries for those pages
- PWA manifest shortcuts in `public/manifest.json` for those pages, if present

### 6.6 Schema (deprecate, drop later)
- `published_content` — kept in schema, no longer written or read. Drop in a follow-up cleanup once the production DB shows zero rows for active users.

### 6.7 i18n
- Remove unused message keys for the deleted pages and dialogs from `src/i18n/messages/he.json` and `en.json`

## 7. Cost & quota

### 7.1 AI cost per user/month (cap: $50)

| Feature | Model | Frequency | Estimated cost |
|---|---|---|---|
| Copy Agent | sonnet-4-6 | ~10 calls/day | ~$1.50 |
| Video Analyzer | sonnet-4-6, 10 frames | 5–10 calls/mo | $1–5 |
| Mirror tone analysis | sonnet-4-6 | 1 call/day | ~$1.50 |
| Analytics insights | sonnet-4-6 | 1 call/day | ~$3 |
| **Total** | | | **~$7–11/month** |

The existing `ai_budget` guardrail (warn at 80% of $50, soft-block at 100%) covers all of this without modification. The three headline features (Video Analyzer, Mirror, Analytics) explicitly stay on Sonnet — no quality compromise.

### 7.2 YouTube quota per user/day (cap: 10,000 units/key)

| Operation | Units | Frequency | Daily |
|---|---|---|---|
| Channel link save | 1 | once per change | <1 |
| Mirror+Analytics sync (`playlistItems.list` + `videos.list`) | 2 | 1× / 24h | 2 |
| Shorts feed — categories (~5 channels × ~3 active cats, +1 `videos.list` per cat for duration filter) | 1 each | 1× / 24h | ~18 |
| Shorts feed — tracked creators (1 `playlistItems.list` + 1 batch `videos.list` per creator) | 2 each | 1× / 24h | ~10 |
| Learn Library (existing) | (cached 24h) | — | ~5 |
| **Total per active user/day** | | | **~35–40** |

Headroom: a single API key supports ~250 active-users-per-day before hitting 10k. Single-tenant usage is well under 1% of quota.

### 7.3 Quota guardrail

- New `youtube_quota_daily` table (one row per date, increments on every API call)
- Settings card "YouTube quota" mirroring the existing AI budget card
- Warn banner at 80% of daily cap; at 100%, all sync routes return last-cached data only
- Counter resets implicitly via the `date` PK at midnight UTC

## 8. Failure handling

| Failure | Behavior |
|---|---|
| Channel URL won't resolve | Save action returns localized error; nothing written to DB |
| Sync API call fails partway | Keep serving previous cache; log error to console; show subtle "last synced X ago" indicator on the page |
| User's channel has 0 videos | Empty state on Mirror/Analytics: "No videos yet on the linked channel" |
| User clears the channel link | Save action wipes profile YT columns + deletes all rows in `youtube_videos`, `youtube_video_stats_history` for that user |
| YouTube quota exceeded for the day | Sync routes return `quota-exceeded`, callers serve last cache, banner shown |
| AI budget exceeded | Existing soft-block on Anthropic calls already covers Mirror tone + Analytics insights |
| Tracked creator URL won't resolve | Same as channel URL — error, nothing stored |
| YouTube returns rate-limit (429) | Backoff + serve last cache; counter not incremented for the failed call |

## 9. Testing checklist (acceptance criteria)

- [ ] Save flow: each accepted URL format resolves correctly to a `channelId` and persists
- [ ] Save flow: invalid URL surfaces the localized error and writes nothing
- [ ] Inline empty-state form on `/mirror`, `/analytics`, `/swipe` saves & immediately repopulates the page
- [ ] Sync runs once per 24h per user; second visit within 24h serves cache
- [ ] Manual "Refresh" button (visible when last sync > 1h) bypasses cache
- [ ] Mirror shows tone, activity hours, this week's posts from synced data
- [ ] Analytics shows 3 metrics + 3 comparison charts + growth-over-time chart + AI insights bullets
- [ ] Style Swipes deck merges category + tracked-creator pools, dedupes, swipe mechanics work
- [ ] Tracked creator add/remove updates the pool on next sync
- [ ] Removing the channel link clears synced rows
- [ ] Quota guardrail warns at 80% and blocks at 100% appropriately
- [ ] All RLS policies enforce per-user data isolation
- [ ] Deleted pages return 404; nav entries gone; FAB shortcuts updated
- [ ] i18n keys for removed UI are gone from both `he.json` and `en.json`
- [ ] Both locales (`he`, `en`) render the new UI correctly with RTL/LTR

## 10. Migration notes

- No automated migration of `published_content` rows. They stay in the DB unread.
- Users with prior manual analytics history will see those rows disappear from the new Analytics page (the new page reads only from `youtube_videos`). Acceptable for a single-tenant app where no user has accumulated meaningful manual data.
- Existing `style_likes` rows from old swipes (videos / edit / photos pages) stay; the AI agents continue using them for memory.
- `published_content` cleanup (DROP TABLE) is deferred to a follow-up after production verification.

## 11. Open questions / future work

- Should tracked creators also feed Mirror tone analysis as a "you've been watching X" signal? *Defer.*
- Should Video Analyzer offer a one-click "analyze a video from my channel" affordance using the synced video list? *Defer to v2 — straightforward addition once this milestone ships.*
- OAuth-based YouTube Analytics (private metrics — watch time, audience retention, subscriber gain)? *Out of scope; ~3 months of work + Google verification.*
- Should categories be user-extensible (add your own search terms / channel list)? *Defer; start with curated config.*

---

**Estimated implementation size:** Comparable to Milestone 4 (Swipes + Mirror) in the original build. ~1 milestone of work.

**Suggested next step:** invoke the `superpowers:writing-plans` skill to break this spec into an implementation plan with phases.
