'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { AddIdeaDialog } from '@/components/ideas/add-idea-dialog';

// =====================================
// Quick Capture — דיאלוג רעיון גלובלי
// זמין מכל דף בתוך האפליקציה
// =====================================

interface QuickCaptureContextValue {
  open: (options?: { seed?: string }) => void;
  close: () => void;
  isOpen: boolean;
}

const QuickCaptureContext = createContext<QuickCaptureContextValue | null>(null);

export function useQuickCapture(): QuickCaptureContextValue {
  const ctx = useContext(QuickCaptureContext);
  if (!ctx) {
    throw new Error('useQuickCapture must be used inside QuickCaptureProvider');
  }
  return ctx;
}

type Props = {
  children: React.ReactNode;
  whisperEnabled: boolean;
  // אם false (אין Supabase) — מציג את הדיאלוג אבל submit ייכשל בחן
  // הרצנו demo mode בנפרד
  enabled: boolean;
};

export function QuickCaptureProvider({
  children,
  whisperEnabled,
  enabled,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const lastNewParamRef = useRef<string | null>(null);

  const open = useCallback((options?: { seed?: string }) => {
    if (options?.seed) setSeed(options.seed);
    else setSeed(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // מאפס את ה-seed אחרי השהיה כדי שהאנימציה תיגמר
    setTimeout(() => setSeed(null), 200);
  }, []);

  // ?new=1 ב-URL — תמיכה בקישורים ישנים / FAB shortcut מ-PWA
  useEffect(() => {
    const newParam = searchParams.get('new');
    // נפתח רק כשהפרמטר משתנה מ-null/אחר ל-'1'
    if (newParam === '1' && lastNewParamRef.current !== '1') {
      open();
    }
    lastNewParamRef.current = newParam;
  }, [searchParams, open]);

  // קיצור מקלדת N — פתח דיאלוג מכל מקום
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // לא לשבש כשמקלידים בשדה
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        open();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  const value = useMemo<QuickCaptureContextValue>(
    () => ({ open, close, isOpen }),
    [open, close, isOpen]
  );

  return (
    <QuickCaptureContext.Provider value={value}>
      {children}
      {/* הדיאלוג עצמו רץ ברמת ה-layout — הצד שלו מסונכרן עם isOpen */}
      <AddIdeaDialog
        controlled={true}
        open={isOpen}
        onOpenChange={(o) => (o ? open() : close())}
        seedContent={seed}
        whisperEnabled={whisperEnabled}
        // ב-demo mode הסבמיט נכשל בחן (UI נשאר פתוח עם הטקסט)
        // ניתן להוסיף הודעה ידידותית בהמשך אם נצטרך
      />
    </QuickCaptureContext.Provider>
  );
}
