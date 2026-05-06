import { setRequestLocale } from 'next-intl/server';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

export default async function TermsPage({
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
      <h1>תנאי שימוש — מצב יוצר</h1>
      <p>עודכן לאחרונה: 2026-05-06.</p>

      <h2>1. הסכמה</h2>
      <p>
        השימוש באפליקציה מהווה הסכמה לתנאים אלה. אם אינך מסכים, אל תשתמש בשירות.
      </p>

      <h2>2. מהות השירות</h2>
      <p>
        מצב יוצר הוא ארגז כלים מבוסס AI המסייע ליוצרי YouTube ליצור כותרות, תיאורים, תמונות
        ממוזערות, רעיונות לסרטונים, וניתוח של סרטונים. השירות מסופק &quot;כמות שהוא&quot;
        (as-is). אנחנו עושים מאמצים סבירים לשמור על איכות, אך לא מתחייבים לתוצאה ספציפית.
      </p>

      <h2>3. החשבון שלך</h2>
      <ul>
        <li>אתה אחראי לשמור על סודיות הגישה לחשבונך.</li>
        <li>אסור להשתמש בחשבון של אחר ללא רשותו.</li>
        <li>גיל מינימום: 16. לקטינים נדרשת הסכמת הורה.</li>
      </ul>

      <h2>4. שימוש מותר ואסור</h2>
      <p>אסור להשתמש בשירות ל:</p>
      <ul>
        <li>תוכן בלתי-חוקי, מטעה, מסית, פוגעני, או מפר זכויות יוצרים.</li>
        <li>spam, scraping בקנה מידה, או הפצה אוטומטית של תוכן שנוצר.</li>
        <li>ניסיון לעקוף מגבלות תקציב או quota.</li>
        <li>שימוש מסחרי המתחרה ישירות בשירות.</li>
      </ul>

      <h2>5. תוכן שנוצר על ידי AI</h2>
      <p>
        הפלט של סוכני ה-AI (כותרות, תיאורים, וכו׳) מסופק לך לשימוש חופשי. אתה האחראי
        הבלעדי לתוכן שאתה מפרסם, לוודא שהוא נכון, ושאינו מפר זכויות. אנחנו לא לוקחים אחריות על
        תוצאות פלט ה-AI ואיננו ערבים לדיוק.
      </p>

      <h2>6. תשלומים, חידושים, וביטולים</h2>
      <ul>
        <li>תוכניות בתשלום מתחדשות אוטומטית בסוף כל מחזור (חודשי/שנתי).</li>
        <li>אפשר לבטל בכל עת מההגדרות. הביטול יחול בסוף תקופת החיוב הנוכחית.</li>
        <li>החזרים: ב-14 הימים הראשונים מהרכישה, החזר מלא לפי דרישה. אחרי כן — לא.</li>
        <li>חיוב מתבצע דרך Lemon Squeezy, מע&quot;מ נכלל היכן שחל.</li>
      </ul>

      <h2>7. שינויי שירות / הפסקה</h2>
      <p>
        אנחנו עשויים לשנות פיצ&apos;רים, להוסיף או להסיר תכנים, או להפסיק את השירות. במקרה של
        הפסקה — תקבל הודעה של 30 ימים מראש, החזר יחסי על מנוי לא מנוצל.
      </p>

      <h2>8. הגבלת אחריות</h2>
      <p>
        השירות מסופק AS-IS, ללא אחריות מפורשת או משתמעת. במקסימום החוק החל, אחריותנו מוגבלת
        לסכום ששילמת בששת החודשים האחרונים. איננו אחראים לנזקים עקיפים.
      </p>

      <h2>9. דין שולט</h2>
      <p>
        תנאים אלה כפופים לדין הישראלי. כל מחלוקת תידון בבתי המשפט המוסמכים בתל-אביב.
      </p>

      <h2>10. צור קשר</h2>
      <p>
        שאלות לגבי התנאים: <a href="mailto:bar.harel.2002@gmail.com">bar.harel.2002@gmail.com</a>.
      </p>
    </>
  );
}

function English() {
  return (
    <>
      <h1>Terms of Service — Creator Mode</h1>
      <p>Last updated: 2026-05-06.</p>

      <h2>1. Acceptance</h2>
      <p>
        Using the app constitutes acceptance of these terms. If you don&apos;t agree, do not
        use the service.
      </p>

      <h2>2. The service</h2>
      <p>
        Creator Mode is an AI-powered toolkit that helps YouTube creators produce titles,
        descriptions, thumbnails, video ideas, and video analysis. The service is provided
        &quot;as is&quot;. We make reasonable efforts to maintain quality but do not guarantee
        specific outcomes.
      </p>

      <h2>3. Your account</h2>
      <ul>
        <li>You are responsible for safeguarding access to your account.</li>
        <li>Don&apos;t use someone else&apos;s account without permission.</li>
        <li>Minimum age: 16. Minors require parental consent.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You may not use the service for:</p>
      <ul>
        <li>Unlawful, deceptive, harassing, or copyright-infringing content.</li>
        <li>Spam, scraping at scale, or automated mass distribution of generated content.</li>
        <li>Attempts to circumvent budget or quota limits.</li>
        <li>Commercial use that directly competes with the service.</li>
      </ul>

      <h2>5. AI-generated content</h2>
      <p>
        AI agent outputs (titles, descriptions, etc.) are provided to you for free use. You are
        solely responsible for what you publish, for ensuring accuracy, and for not infringing
        rights. We take no responsibility for AI output outcomes and do not warrant accuracy.
      </p>

      <h2>6. Payments, renewals, cancellation</h2>
      <ul>
        <li>Paid plans auto-renew at the end of each billing cycle (monthly/yearly).</li>
        <li>Cancel anytime from settings. Cancellation takes effect at end of current period.</li>
        <li>Refunds: full refund within 14 days of purchase upon request. After that — no.</li>
        <li>Billing handled by Lemon Squeezy. VAT included where applicable.</li>
      </ul>

      <h2>7. Service changes / discontinuation</h2>
      <p>
        We may change features, add or remove content, or discontinue the service. In case of
        discontinuation — you&apos;ll receive 30 days&apos; notice and a pro-rata refund for
        unused subscription.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        The service is provided AS-IS without express or implied warranties. To the maximum
        extent permitted by law, our liability is capped at the amount you paid in the past 6
        months. We are not liable for indirect damages.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the laws of Israel. Disputes shall be resolved in courts of
        competent jurisdiction in Tel Aviv.
      </p>

      <h2>10. Contact</h2>
      <p>
        Terms questions: <a href="mailto:bar.harel.2002@gmail.com">bar.harel.2002@gmail.com</a>.
      </p>
    </>
  );
}
