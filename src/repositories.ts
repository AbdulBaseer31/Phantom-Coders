import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { bucket, db } from './firebase';
import {
  Alert,
  AlertRepository,
  CURRENT_SCHEMA_VERSION,
  GameSession,
  GameSessionRepository,
  MedicationEvent,
  MedicationRepository,
  Patient,
  PatientRepository,
  StorageService,
} from './domain';

function toDate(value: unknown): Date | undefined {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return undefined;
}

function withDates<T>(data: T): T {
  const record = data as Record<string, unknown>;
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, toDate(value) ?? value])) as T;
}

export class FirestorePatientRepository implements PatientRepository {
  async get(patientId: string): Promise<Patient | null> {
    const snapshot = await db.doc(`patients/${patientId}`).get();
    return snapshot.exists ? withDates(snapshot.data() as Patient) : null;
  }

  async listInactive(cutoff: Date, limit: number): Promise<Patient[]> {
    const cutoffTimestamp = Timestamp.fromDate(cutoff);
    const [activitySnapshot, syncSnapshot] = await Promise.all([
      db.collection('patients').where('lastActivityAt', '<', cutoffTimestamp).limit(limit).get(),
      db.collection('patients').where('lastSyncAt', '<', cutoffTimestamp).limit(limit).get(),
    ]);
    const candidates = new Map<string, Patient>();
    for (const doc of [...activitySnapshot.docs, ...syncSnapshot.docs]) {
      candidates.set(doc.id, withDates({ id: doc.id, ...doc.data() } as Patient));
    }
    return [...candidates.values()]
      .filter((patient) => Math.max(patient.lastActivityAt?.getTime() ?? 0, patient.lastSyncAt?.getTime() ?? 0) < cutoff.getTime())
      .slice(0, limit);
  }

  async save(patient: Patient): Promise<void> {
    await db.doc(`patients/${patient.id}`).set({ ...patient, schemaVersion: CURRENT_SCHEMA_VERSION }, { merge: true });
  }
}

export class FirestoreGameSessionRepository implements GameSessionRepository {
  async create(session: Omit<GameSession, 'schemaVersion'>): Promise<GameSession> {
    const ref = db.collection(`patients/${session.patientId}/gameSessions`).doc();
    const value = { ...session, id: ref.id, schemaVersion: CURRENT_SCHEMA_VERSION };
    await ref.set(value);
    return value;
  }

  async get(sessionId: string): Promise<GameSession | null> {
    const snapshot = await db.collectionGroup('gameSessions').where('id', '==', sessionId).limit(1).get();
    return snapshot.empty ? null : withDates(snapshot.docs[0].data() as GameSession);
  }
}

export class FirestoreAlertRepository implements AlertRepository {
  async hasActiveWelfareAlert(patientId: string): Promise<boolean> {
    const result = await db.collection('alerts').where('patientId', '==', patientId).where('type', '==', 'WELFARE_INACTIVITY').where('status', '==', 'ACTIVE').limit(1).get();
    return !result.empty;
  }

  async create(alert: Omit<Alert, 'id' | 'schemaVersion'>): Promise<Alert> {
    const ref = db.collection('alerts').doc();
    const value = { ...alert, id: ref.id, schemaVersion: CURRENT_SCHEMA_VERSION };
    await ref.set(value);
    return value;
  }
}

export class FirestoreMedicationRepository implements MedicationRepository {
  async create(event: Omit<MedicationEvent, 'schemaVersion'>): Promise<MedicationEvent> {
    const ref = db.collection(`patients/${event.patientId}/medications`).doc();
    const value = { ...event, id: ref.id, schemaVersion: CURRENT_SCHEMA_VERSION };
    await ref.set(value);
    return value;
  }
}

export class FirebaseStorageService implements StorageService {
  async getAudioDownloadUrl(patientId: string, fileName: string): Promise<string> {
    const [url] = await bucket.file(`patientAudio/${patientId}/${fileName}`).getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
    return url;
  }
}

export function serverTimestamp(): FieldValue {
  return FieldValue.serverTimestamp();
}
