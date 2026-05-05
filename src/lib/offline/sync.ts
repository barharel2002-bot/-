// =============================
// סנכרון רעיונות מקומיים → Supabase
// =============================

import { createIdea } from '@/lib/ideas/actions';
import {
  deletePendingIdea,
  getPendingIdeas,
  type PendingIdea,
} from './idb';

export interface SyncResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

// מסנכרן את כל ה-pending ideas לשרת
// אם הצליח — מוחק מ-IndexedDB. אם נכשל — נשאר לסנכרון הבא
export async function syncPendingIdeas(): Promise<SyncResult> {
  let pending: PendingIdea[];
  try {
    pending = await getPendingIdeas();
  } catch {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  if (pending.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const item of pending) {
    const formData = new FormData();
    formData.append('content', item.content);
    item.tags.forEach((t) => formData.append('tags', t));

    try {
      const result = await createIdea(formData);
      if (result.ok) {
        await deletePendingIdea(item.id);
        succeeded++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { attempted: pending.length, succeeded, failed };
}
