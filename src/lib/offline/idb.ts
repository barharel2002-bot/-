// =============================
// עטיפה דקה ל-IndexedDB
// בלי תלות ב-libs חיצוניות
// =============================

const DB_NAME = 'creator-mode';
const DB_VERSION = 1;
const STORE_PENDING_IDEAS = 'pending_ideas';

export interface PendingIdea {
  id: number; // auto-increment
  content: string;
  tags: string[];
  createdAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PENDING_IDEAS)) {
        db.createObjectStore(STORE_PENDING_IDEAS, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function addPendingIdea(
  data: Omit<PendingIdea, 'id'>
): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_IDEAS, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_IDEAS);
    const req = store.add(data);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingIdeas(): Promise<PendingIdea[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_IDEAS, 'readonly');
    const store = tx.objectStore(STORE_PENDING_IDEAS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as PendingIdea[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingIdea(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_IDEAS, 'readwrite');
    const store = tx.objectStore(STORE_PENDING_IDEAS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function countPendingIdeas(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_IDEAS, 'readonly');
    const store = tx.objectStore(STORE_PENDING_IDEAS);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
