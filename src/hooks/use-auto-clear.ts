'use client';

import { useEffect } from 'react';

// Hook עזר לאיפוס state אחרי השהיה.
// משתמש ב-cleanup של useEffect כדי לבטל את הטיימר אם הקומפוננטה
// מתפרקת לפני שהוא עף — מונע React warning של setState על unmounted.
//
// שימוש:
//   const [saved, setSaved] = useState(false);
//   useAutoClear(saved, () => {
//     setSaved(false);
//     onClose();
//   }, 1500);
//
//   // ב-handler: setSaved(true);
export function useAutoClear(
  active: boolean,
  callback: () => void,
  delayMs: number
) {
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(callback, delayMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, delayMs]);
}
