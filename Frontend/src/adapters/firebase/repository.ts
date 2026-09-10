import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, startAfter, addDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { adapterRegistry } from '../registry';
import {
  AuthorizationError,
  type Alert,
  type AlertQuery,
  type AuditEvent,
  type AuditQuery,
  type DashboardRepository,
  type DeviceHealth,
  type LanguagePackHealth,
  type MedicationEvent,
  type MedicationQuery,
  type Patient,
  type Session,
  type SessionQuery,
  type TrendPoint,
  type TrendQuery,
  type Page
} from '../../domain/models';
import type { QuarantinedDocument } from '../documents';

export class FirebaseDashboardRepository implements DashboardRepository {
  
  private quarantinedCache: QuarantinedDocument[] = [];

  private async fetchPage<Raw, Out>(
    q: any,
    adapter: ReturnType<typeof import('../registry').makeAdapter>,
    pageSize: number
  ): Promise<Page<Out>> {
    const snapshot = await getDocs(q);
    const items: Out[] = [];
    
    snapshot.docs.forEach(docSnap => {
      const result = adapter(docSnap.data() as any, docSnap.id);
      if (result.value) {
        items.push(result.value as Out);
      }
      if (result.quarantined.length > 0) {
        this.quarantinedCache.push(...result.quarantined);
      }
    });

    const nextCursor = snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return { items, nextCursor };
  }

  async patients(): Promise<Patient[]> {
    const q = collection(db, 'patients');
    const snapshot = await getDocs(q);
    const items: Patient[] = [];
    snapshot.docs.forEach(docSnap => {
      const result = adapterRegistry.patient(docSnap.data() as any, docSnap.id);
      if (result.value) items.push(result.value);
      this.quarantinedCache.push(...result.quarantined);
    });
    return items;
  }

  async trends(tQuery: TrendQuery): Promise<TrendPoint[]> {
    const q = query(collection(db, 'telemetry'), where('patientId', '==', tQuery.patientId));
    const snapshot = await getDocs(q);
    const items: TrendPoint[] = [];
    snapshot.docs.forEach(docSnap => {
      const result = adapterRegistry.trend(docSnap.data() as any, docSnap.id);
      if (result.value) items.push(result.value);
      this.quarantinedCache.push(...result.quarantined);
    });
    return items.slice(-tQuery.days);
  }

  async sessions(sQuery: SessionQuery): Promise<Page<Session>> {
    let q = query(
      collection(db, `patients/${sQuery.patientId}/gameSessions`),
      orderBy('completedAt', 'desc'),
      limit(sQuery.pageSize)
    );
    if (sQuery.cursor) {
      const docRef = await getDoc(doc(db, `patients/${sQuery.patientId}/gameSessions`, sQuery.cursor));
      if (docRef.exists()) q = query(q, startAfter(docRef));
    }
    return this.fetchPage(q, adapterRegistry.session as any, sQuery.pageSize);
  }

  async medications(mQuery: MedicationQuery): Promise<Page<MedicationEvent>> {
    let q = query(collection(db, `patients/${mQuery.patientId}/medications`), limit(mQuery.pageSize));
    if (mQuery.cursor) {
      const docRef = await getDoc(doc(db, `patients/${mQuery.patientId}/medications`, mQuery.cursor));
      if (docRef.exists()) q = query(q, startAfter(docRef));
    }
    return this.fetchPage(q, adapterRegistry.medication as any, mQuery.pageSize);
  }

  async alerts(aQuery: AlertQuery): Promise<Page<Alert>> {
    let q = query(collection(db, 'alerts'), where('patientId', '==', aQuery.patientId), limit(aQuery.pageSize));
    if (aQuery.cursor) {
      const docRef = await getDoc(doc(db, 'alerts', aQuery.cursor));
      if (docRef.exists()) q = query(q, startAfter(docRef));
    }
    return this.fetchPage(q, adapterRegistry.alert as any, aQuery.pageSize);
  }

  async device(patientId: string): Promise<DeviceHealth> {
    const docRef = await getDoc(doc(db, 'devices', patientId));
    if (docRef.exists()) {
      const result = adapterRegistry.device(docRef.data() as any, docRef.id);
      this.quarantinedCache.push(...result.quarantined);
      if (result.value) return result.value;
    }
    return {
        patientId, battery: null, storageFreeGb: null, pendingQueue: null,
        oldestQueueHours: null, modelVersion: null, modelChecksum: 'unavailable',
        speechHealth: 'not reported', lastSync: 'unknown',
    };
  }

  async audit(aQuery: AuditQuery): Promise<Page<AuditEvent>> {
    let q = query(
      collection(db, 'auditLogs'),
      where('targetPatientUid', '==', aQuery.patientId),
      orderBy('timestamp', 'desc'),
      limit(aQuery.pageSize)
    );
    if (aQuery.cursor) {
      const docRef = await getDoc(doc(db, 'auditLogs', aQuery.cursor));
      if (docRef.exists()) q = query(q, startAfter(docRef));
    }
    return this.fetchPage(q, adapterRegistry.audit as any, aQuery.pageSize);
  }

  async languagePack(patientId: string): Promise<LanguagePackHealth> {
    return { language: 'Not reported', packVersion: null, checksum: 'unavailable', lastSync: null };
  }

  async quarantined(patientId?: string): Promise<QuarantinedDocument[]> {
    return patientId ? this.quarantinedCache.filter(q => q.patientUid === patientId) : this.quarantinedCache;
  }

  async recordAudioAttempt(patientId: string, sessionId: string, outcome: 'allowed' | 'denied'): Promise<void> {
    await addDoc(collection(db, 'auditLogs'), {
      targetPatientUid: patientId, timestamp: new Date().toISOString(),
      action: `Protected audio play attempt (${sessionId})`, result: outcome, schemaVersion: 1
    });
  }

  async acknowledgeAlert(alertId: string, patientId: string): Promise<void> {
    await updateDoc(doc(db, 'alerts', alertId), { status: 'ACKNOWLEDGED' });
  }

  async requestAlertEscalation(patientId: string): Promise<void> {}
  async requestMedicationNote(patientId: string, note: string): Promise<void> {}
}
