import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

const projectId =
  process.env.FIREBASE_PROJECT_ID ?? 'dementia-local';

const databaseURL =
  process.env.FIREBASE_DATABASE_URL ??
  `http://127.0.0.1:9000?ns=${projectId}`;

const app =
  getApps()[0] ??
  initializeApp({
    projectId,
    databaseURL,
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ??
      `${projectId}.appspot.com`,
  });

export const db = getFirestore(app);
export const auth = getAuth(app);
export const messaging = getMessaging(app);
export const bucket = getStorage(app).bucket();
export const realtimeDb = getDatabase(app);
