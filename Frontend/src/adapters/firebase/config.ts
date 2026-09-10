import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  projectId: "dementia-3ee29",
  apiKey: "AIzaSyDCOA9RutEXJsLqo9R-b8gkVNDNSl_N2Cw",
  appId: "1:546588994790:android:d2a987dfafc10040241f27",
  storageBucket: "dementia-3ee29.firebasestorage.app"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Use emulator if VITE_USE_EMULATOR is set
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
}
