export const dynamic = 'force-static';

import { setRequestLocale } from 'next-intl/server';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Content />;
}

function Content() {
  const locale = useLocale() as 'he' | 'en';
  return (
    <article className="prose prose-invert mx-auto max-w-3xl py-8 prose-headings:tracking-tight prose-h1:mb-4 prose-h2:mt-8 prose-h2:mb-3 prose-p:leading-relaxed prose-p:text-muted-foreground">
      {locale === 'he' ? <Hebrew /> : <English />}
      <p className="mt-12 text-xs">
        <Link href="/welcome">→ חזרה לדף הבית</Link>
      </p>
    </article>
  );
}

function Hebrew() {
  return (
    <>
      <h1>מדיניות פרטיות — מצב יוצר</h1>
      <p>
        עודכן לאחרונה: 2026-05-06. מדיניות הפרטיות שלנו מסבירה איזה מידע אנחנו אוספים, איך
        אנחנו משתמשים בו, ומה הזכויות שלך.
      </p>

      <h2>1. מי אנחנו</h2>
      <p>
        מצב יוצר (&ldquo;האפליקציה&rdquo;) הוא כלי מבוסס AI ליוצרי תוכן ב-YouTube. השירות מופעל על ידי הר-אל
        בר. ליצירת קשר: bar.harel.2002@gmail.com.
      </p>

      <h2>2. איזה מידע אנחנו אוספים</h2>
      <ul>
        <li>
          <strong>חשבון:</strong> כתובת מייל (דרך Magic Link או Sign in with Google), שם
          ותמונת פרופיל אם נמסרים על ידי Google.
        </li>
        <li>
          <strong>תוכן שאתה מעלה:</strong> רעיונות, תיאורי סרטונים, תקצירים שאתה מזין לסוכני ה-AI.
        </li>
        <li>
          <strong>קישורים שאתה מספק:</strong> URL של ערוץ YouTube, יוצרים נעקבים, קטגוריות שאתה
          בוחר. אנחנו מושכים נתונים <em>פומביים</em> בלבד דרך YouTube Data API.
        </li>
        <li>
          <strong>פלט AI:</strong> שומרים את הפלט של סוכני ה-AI כדי לאפשר לך לחזור אליו ולשפר
          את הסוכן בעזרת פידבק שלך.
        </li>
        <li>
          <strong>שימוש:</strong> מספר קריאות AI חודשי, סוויפים, מטא-דאטה (לא תוכן הסרטונים).
        </li>
        <li>
          <strong>סרטונים בבדיקת סרטון:</strong> הקובץ <strong>לעולם לא מועלה לשרת שלנו</strong>.
          מתבצע חילוץ פריימים בדפדפן שלך, ורק הפריימים הקטנים נשלחים ל-Anthropic לניתוח.
        </li>
      </ul>

      <h2>3. איך אנחנו משתמשים במידע</h2>
      <ul>
        <li>הפעלת השירות (יצירת תיאורים, כותרות, ניתוח סרטון, וכו׳).</li>
        <li>אימוץ הסוכן לאישיות שלך — דרך הפידבק שלך.</li>
        <li>חיוב (אם רכשת תוכנית בתשלום) דרך Lemon Squeezy.</li>
        <li>תמיכה — תגובה לפניות שלך.</li>
      </ul>

      <h2>4. עם מי אנחנו חולקים מידע</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — מאחסן את החשבון והתוכן שלך. EU/US infrastructure.
        </li>
        <li>
          <strong>Anthropic</strong> — מקבל את ה-prompt ומחזיר את הפלט. לא משמר נתונים מעבר ל-30
          ימים לפי מדיניותם.
        </li>
        <li>
          <strong>Google (YouTube Data API)</strong> — שולחים בקשות לתוכן ציבורי. לא משתפים את
          הזהות שלך.
        </li>
        <li>
          <strong>Lemon Squeezy</strong> — אם תרכוש מנוי, פרטי החיוב שלך מנוהלים על ידם
          (PCI-compliant).
        </li>
        <li>
          <strong>Netlify</strong> — מארח האתר.
        </li>
      </ul>
      <p>איננו מוכרים מידע. איננו משתפים עם מפרסמים. איננו עושים targeting פרסומי.</p>

      <h2>5. הזכויות שלך</h2>
      <ul>
        <li>זכות לקבל עותק של כל המידע שלך — פנה אלינו.</li>
        <li>
          זכות למחוק את החשבון בכל עת — בהגדרות → &ldquo;מחק חשבון&rdquo; (כל הנתונים נמחקים תוך 30 ימים).
        </li>
        <li>זכות לתקן מידע לא מדויק.</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        אנחנו משתמשים ב-cookies תפקודיים בלבד (session, language preference). אין cookies לפרסום
        או tracking של צד שלישי.
      </p>

      <h2>7. שינויים</h2>
      <p>
        עדכונים למדיניות יפורסמו בעמוד הזה עם תאריך עדכון. שינויים מהותיים יישלחו אליך במייל.
      </p>

      <h2>8. צור קשר</h2>
      <p>
        שאלות, בקשות מחיקה, או דיווח על בעיות פרטיות:{' '}
        <a href="mailto:bar.harel.2002@gmail.com">bar.harel.2002@gmail.com</a>.
      </p>
    </>
  );
}

function English() {
  return (
    <>
      <h1>Privacy Policy — Creator Mode</h1>
      <p>
        Last updated: 2026-05-06. This policy explains what data we collect, how we use it, and
        your rights.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Creator Mode (&quot;the App&quot;) is an AI toolkit for YouTube creators, operated by
        Harel Bar. Contact: bar.harel.2002@gmail.com.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> email (via Magic Link or Sign in with Google), name and
          profile picture if provided by Google.
        </li>
        <li>
          <strong>Content you submit:</strong> ideas, video summaries, prompts you enter into AI
          agents.
        </li>
        <li>
          <strong>Links you provide:</strong> YouTube channel URLs, tracked creators, categories
          you pick. We pull <em>public</em> data only via YouTube Data API.
        </li>
        <li>
          <strong>AI outputs:</strong> stored so you can revisit them and so the agent can learn
          from your &quot;not a fit&quot; feedback.
        </li>
        <li>
          <strong>Usage:</strong> monthly AI call counts, swipes, metadata (not video content).
        </li>
        <li>
          <strong>Videos in Video Check:</strong> the file is <strong>never uploaded</strong> to
          our server. Frame extraction happens in your browser; only the frame thumbnails are
          sent to Anthropic for analysis.
        </li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To run the service (titles, descriptions, thumbnails, video analysis, etc.).</li>
        <li>To personalize the agent based on your feedback.</li>
        <li>For billing (if you subscribe) via Lemon Squeezy.</li>
        <li>For support — responding to your inquiries.</li>
      </ul>

      <h2>4. Who we share with</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — hosts your account and content. EU/US infrastructure.
        </li>
        <li>
          <strong>Anthropic</strong> — receives prompts and returns outputs. Per their policy,
          data is not retained beyond 30 days.
        </li>
        <li>
          <strong>Google (YouTube Data API)</strong> — we send requests for public content
          only. Your identity is not shared.
        </li>
        <li>
          <strong>Lemon Squeezy</strong> — if you subscribe, billing details are handled by them
          (PCI-compliant).
        </li>
        <li>
          <strong>Netlify</strong> — hosts the site.
        </li>
      </ul>
      <p>
        We do not sell data. We do not share with advertisers. No third-party ad targeting.
      </p>

      <h2>5. Your rights</h2>
      <ul>
        <li>Right to a copy of all your data — contact us.</li>
        <li>
          Right to delete your account anytime — Settings → &quot;Delete account&quot; (all data
          erased within 30 days).
        </li>
        <li>Right to correct inaccurate data.</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        We use only functional cookies (session, language preference). No advertising or
        third-party tracking cookies.
      </p>

      <h2>7. Changes</h2>
      <p>
        Updates to this policy will be posted on this page with a new date. Material changes
        will also be sent to you by email.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions, deletion requests, or privacy concerns:{' '}
        <a href="mailto:bar.harel.2002@gmail.com">bar.harel.2002@gmail.com</a>.
      </p>
    </>
  );
}
