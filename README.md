# מצב יוצר — Creator Mode

> כלי מיינדסט אישי שעוזר להישאר במצב של יוצר תוכן לאורך היום, לזהות הזדמנויות בזמן אמת, ולשמור על הקול והסגנון האותנטיים שלך.
>
> **לא** כלי תזמון פוסטים. **לא** עורך וידאו. כלי לחשיבה.

---

## מה כלול באפליקציה

האפליקציה הושלמה ב-6 אבני דרך. כל הפיצ'רים בנויים מקצה לקצה:

### אבן דרך 1 — שלד ויסוד
- Next.js 14 + TypeScript strict
- ערכת עיצוב כהה אלגנטית עם גרדיאנט creator vibe (סגול-כתום)
- דו-לשוניות מלאה (עברית RTL + אנגלית LTR) עם החלפה בלחיצה
- ניווט (תחתון במובייל, סיידבר בדסקטופ) עם FAB גרדיאנט להוספה מהירה
- 11 routes (כל פיצ'ר + auth callback)
- תשתית Supabase (auth + DB) ו-i18n

### אבן דרך 2 — לוח רעיונות + תזכורות
- **לוח רעיונות מלא** — הוספה מהירה, תיוג ב-6 קטגוריות, חיפוש, סינון, עריכה inline, מצב ריק עם שאלות פתיחה
- **Magic link auth** דרך Supabase
- **הגדרות:** "למה אני יוצר", "בשביל מי", תדירות תזכורות, התנתקות
- **Web Push:** Service Worker, הרשאה, כפתור "שלח התראת בדיקה" שמציג את ה-"למה" שלך
- **SetupGate** — מסך הסבר אם מפתחות סביבה חסרים

### אבן דרך 3 — סוכני AI
- **סוכן קופי** — קלט רעיון → כיתוב + 3 hooks + tags. כפתור "לא מתאים" עם הסבר → memory אישי שמוזרק לכל קריאה הבאה
- **ניתוח סרטונים** — חילוץ פריימים בצד-לקוח, ניתוח Vision של Claude (התאמה / פלטפורמה / זמן פרסום / hook quality / טיפים)
- **תקציב AI** — מעקב חודשי מול $50, אזהרה ב-80%, חסימה רכה ב-100%, כרטיס סטטוס בהגדרות
- **Prompt caching** ב-Anthropic SDK — חיסכון ~90% מהעלות בקריאות חוזרות
- מודל ברירת מחדל: `claude-sonnet-4-6`

### אבן דרך 4 — סוויפים + מראה
- **3 עמודי סוויפים** (סרטונים / עריכה / תמונות) עם מנגנון Tinder מלא:
  - הדבקת קישור → oEmbed (TikTok / YouTube) או OG meta tags (Instagram + שאר)
  - Drag עם Framer Motion + תוויות ✕/♥ חיות
  - קיצורי מקלדת: ←/→ + Z ל-undo
  - Optimistic UI + queue persistence
- **מראה שבועית** — סיכום פרסומים, טון דומיננטי, שעות פעילות, טיוטות, רעיונות לא פותחו, סגנונות שאהבת
- **"סמן כפורסם"** על כל רעיון — יוצר רשומה ב-`published_content`, מזין את המראה והאנליטיקה
- הסוויפים שאהבת **מוזרמים לסוכני ה-AI** ככלי ללמידת הסגנון

### אבן דרך 5 — ספרייה + אנליטיקה
- **ספריית הדרכה** מ-YouTube — 5 קטגוריות, ערבוב Shorts/long, נגן מוטמע, סימון ★ "שמור" / "מועיל"
- Next.js fetch cache 24 שעות → quota יעיל
- **אנליטיקה** — רשימת פוסטים עם 6 מדדים (צפיות / לייקים / שמירות / שיתופים / תגובות / זמן צפייה)
- 3 גרפי השוואה: לפי סוג / טון / שעת פרסום
- היסטוריית מדדים נשמרת — ניתן לעדכן בכל זמן

### אבן דרך 6 — ליטוש + Offline
- **Loading skeletons** לכל הדפים האטיים
- **Service Worker מלא** — app shell caching, network-first למסמכים, fallback offline
- **PWA shortcuts** במניפסט — "הוסף רעיון" / "ניתוח סרטון" / "מראה שבועית" ישירות מהמסך הראשי של המכשיר
- **IndexedDB queue** ל-offline — רעיונות נשמרים מקומית ומסתנכרנים אוטומטית כשחוזרים אונליין
- **Online indicator** — באנר עליון שמופיע באופליין / סנכרון
- **RTL מובנה מקצה לקצה** — אפס שימוש ב-`mr/ml/pr/pl/text-left/right`, רק logical properties

---

## הוראות התקנה — שלב אחר שלב

### 1. Node.js (חד-פעמי)
הורד גרסה LTS מ-https://nodejs.org/he. ודא שזה עובד:
```bash
node --version
npm --version
```

### 2. תלויות הפרויקט
```bash
npm install
```

### 3. Supabase
1. https://supabase.com → **New Project**.
2. **SQL Editor** → **New query** → הדבק את `supabase/schema.sql` במלואו → **Run**.
3. **Storage** → צור buckets: `videos` (Private), `idea-images` (Private).
4. **Authentication → URL Configuration** → הוסף `http://localhost:3000` ל-Site URL.
5. **Settings → API** → העתק את 3 המפתחות לקובץ `.env.local` (כבר נוצר):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### 4. Anthropic Claude
1. https://console.anthropic.com → **API Keys** → **Create Key**.
2. **Settings → Limits** — קבע **Spending limit ל-$50/חודש** כדי לא לחרוג בטעות.
3. הוסף ל-`.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### 5. YouTube Data API v3
1. Google Cloud Console → **APIs & Services** → Enable **YouTube Data API v3**.
2. **Credentials** → Create API Key.
3. הוסף ל-`.env.local`:
   ```
   YOUTUBE_API_KEY=AIza...
   ```

### 6. (אופציונלי) OpenAI Whisper לתמלול הקלטות
לא חובה לעת עתה. אם תרצה בעתיד:
```
OPENAI_API_KEY=sk-...
```

### 7. VAPID keys ל-Push notifications
```bash
npx web-push generate-vapid-keys
```
העתק את שני הערכים:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

### 8. הרצה
```bash
npm run dev
```
פתח http://localhost:3000 — תופנה ל-`/he`. הקלק על "התחבר" → תקבל email עם magic link → לחץ → אתה בפנים.

---

## פקודות שימושיות

| פקודה | מה עושה |
|---|---|
| `npm run dev` | שרת פיתוח עם hot reload |
| `npm run build` | בונה גרסת production |
| `npm run start` | מריץ build (אחרי `build`) |
| `npm run lint` | ESLint |

---

## מבנה הפרויקט

```
src/
├── app/
│   ├── [locale]/                # כל הדפים תחת locale (he/en)
│   │   ├── layout.tsx           # פונטים, RTL, ניווט, SW, offline indicator
│   │   ├── page.tsx             # דף בית
│   │   ├── auth/                # magic link
│   │   ├── ideas/               # פיצ'ר 5
│   │   ├── analyze/             # פיצ'ר 2
│   │   ├── swipe/{videos,styles,photos}/  # פיצ'ר 4
│   │   ├── mirror/              # פיצ'ר 1
│   │   ├── learn/               # פיצ'ר 3
│   │   ├── copy/                # פיצ'ר 7
│   │   ├── analytics/           # פיצ'ר 8
│   │   └── settings/            # הגדרות
│   ├── api/
│   │   ├── ai/analyze-video/    # ניתוח סרטון (vision)
│   │   ├── push/                # subscribe + test
│   │   └── swipes/og/           # OG metadata fetcher
│   └── auth/callback/           # Supabase magic link callback
├── components/
│   ├── ui/                      # Button, Card, Input, Textarea, Label, Dialog
│   ├── layout/                  # Header, NavBar, LocaleToggle
│   ├── ideas/                   # IdeaCard, AddIdeaDialog, IdeasBoard
│   ├── swipes/                  # AddLinkForm, SwipeDeck, SwipeCard
│   ├── mirror/                  # MirrorView, ActivityChart
│   ├── learn/                   # VideoCard, LearnPage (with embed modal)
│   ├── copy/                    # CopyForm + feedback dialog
│   ├── analyze/                 # VideoAnalyzer (frame extraction + result)
│   ├── analytics/               # AnalyticsPage, MetricsDialog, charts
│   ├── settings/                # WhyForm, PushToggle, BudgetCard, AccountCard
│   ├── publish/                 # PublishDialog (mark as published)
│   ├── auth/                    # SignInForm
│   └── shared/                  # Skeleton, OfflineIndicator, RegisterSW, SetupGate
├── lib/
│   ├── ai/                      # Anthropic client, prompts, budget
│   ├── auth/                    # Server actions for sign-in/out
│   ├── ideas/                   # CRUD actions + queries
│   ├── swipes/                  # OG fetcher, actions, queries
│   ├── mirror/                  # Aggregation queries
│   ├── learn/                   # Save/useful actions
│   ├── youtube/                 # Search API client
│   ├── analytics/               # Queries + actions
│   ├── publish/                 # Mark-as-published action
│   ├── settings/                # Profile actions
│   ├── push/                    # Client subscription helper
│   ├── offline/                 # IndexedDB queue + sync
│   ├── supabase/                # Browser + server clients
│   ├── video/                   # Frame extraction (canvas)
│   ├── config.ts                # Env vars detection
│   └── utils.ts
├── i18n/
│   ├── routing.ts
│   ├── request.ts
│   └── messages/{he,en}.json
├── config/
│   └── creators.config.ts       # YouTube search queries לכל קטגוריה
├── types/
│   └── index.ts
└── middleware.ts                # i18n routing + auth gating

supabase/
└── schema.sql                   # 10 טבלאות, RLS, אינדקסים, RPC לאגרגציה

public/
├── sw.js                        # Service Worker (push + cache)
├── manifest.json                # PWA + shortcuts
└── icons/                       # 192/512 SVG
```

---

## אבטחה

- `.env.local` לא נכנס ל-Git (ב-`.gitignore`)
- מפתחות AI חיים בסביבה בלבד, לא בקוד
- Row Level Security ב-Supabase — כל משתמש רואה רק את הנתונים שלו
- Magic link auth — אין סיסמאות לאחסן

---

## רשימת המודלים בשימוש

| תפקיד | מודל | למה |
|---|---|---|
| סוכן קופי | claude-sonnet-4-6 | איזון איכות/עלות לכמות גבוהה |
| ניתוח סרטון (vision) | claude-sonnet-4-6 | תומך תמונות מרובות + JSON |

ניתן לעקוף ב-`.env.local`: `ANTHROPIC_MODEL=claude-opus-4-7` (יקר יותר).

---

## העלאה ל-production (Vercel מומלץ)

1. דחוף קוד ל-GitHub (`git init && git add . && git commit -m "..." && git push`).
2. https://vercel.com → **Import Project** → בחר את ה-repo.
3. ב-Vercel: **Settings → Environment Variables** → הוסף את 8 המפתחות מ-`.env.local`.
4. **Deploy**.

ב-Supabase: עדכן **Authentication → URL Configuration** עם הדומיין החדש (לדוגמה `https://creator-mode.vercel.app`).

---

## מה לא נבנה במכוון

- ❌ פרסום אוטומטי לרשתות
- ❌ עריכת וידאו בתוך האפליקציה
- ❌ קהילה / שיתוף עם יוצרים אחרים
- ❌ חיבור API ישיר ל-Instagram/TikTok (TODO לעתיד — צריך Graph API + Display API)
- ❌ הקלטה קולית עם Whisper (תוכננה לאבן דרך 2.5 — לא הופעלה)
- ❌ תזמון אוטומטי של תזכורות Push (דורש cron של hosting — Vercel Cron / Netlify Scheduled Functions)
