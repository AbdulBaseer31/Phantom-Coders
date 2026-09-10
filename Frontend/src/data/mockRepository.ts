// Mock implementation of the DashboardRepository contract, mirroring the
// SIH26003 backend document schema. All data flows through the adapter
// registry; quarantined documents are surfaced to views instead of silently
// rendered. Swapping in the Firebase implementation means mounting a
// different provider; no view changes.
import {
  adapterRegistry,
  adaptAlert,
  adaptAudit,
  adaptDevice,
  adaptMedication,
  adaptPatient,
  adaptSession,
  adaptTrendPoint,
} from '../adapters/registry';
import {
  AuthorizationError,
  type Alert,
  type AuditEvent,
  type AuditQuery,
  type DashboardRepository,
  type DeviceHealth,
  type LanguagePackHealth,
  type MedicationEvent,
  type Patient,
  type Session,
  type SessionQuery,
  type TrendPoint,
  type TrendQuery,
} from '../domain/models';
import type { QuarantinedDocument } from '../adapters/documents';
import {
  alertDocs,
  auditDocs,
  awaitingSyncPatient,
  deviceDocs,
  doctorIdentity,
  fixtureDays,
  medicationDocs,
  patientDocs,
  patientIds,
  revokedAssignment,
  sessionDocs,
  trendDocs,
} from './fixtures';

export interface RepositoryState {
  quarantined: QuarantinedDocument[];
}

const state: RepositoryState = { quarantined: [] };

const later = <T>(value: T, ms = 200): Promise<T> =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

function assertAssignment(patientId: string): void {
  if (patientId === revokedAssignment) {
    throw new AuthorizationError();
  }
}

// Quarantine records are scoped per patient so a notice never reports
// another patient's withheld documents.
export function quarantinedFor(patientId: string): QuarantinedDocument[] {
  return state.quarantined.filter((q) => !q.patientUid || q.patientUid === patientId);
}

export function repositoryState(): RepositoryState {
  return state;
}

const adaptedPatients: Patient[] = [];
patientDocs.forEach((doc, i) => {
  const result = adaptPatient(doc, patientIds[i]);
  if (result.value) {
    // The roster flags the revoked assignment keyed on the adapted id, so
    // the marker is robust to fixture ordering.
    adaptedPatients.push(
      result.value.id === revokedAssignment ? { ...result.value, assignmentRevoked: true } : result.value,
    );
  }
  state.quarantined.push(...result.quarantined);
});

const trendCache = new Map<string, TrendPoint[]>();
function trendsFor(patientId: string): TrendPoint[] {
  if (!trendCache.has(patientId)) {
    const points: TrendPoint[] = [];
    for (const doc of trendDocs(patientId)) {
      const result = adaptTrendPoint(doc, `${patientId}:${doc.date}`);
      if (result.value) points.push(result.value);
      state.quarantined.push(...result.quarantined);
    }
    trendCache.set(patientId, points);
  }
  return trendCache.get(patientId)!;
}

const sessionCache = new Map<string, Session[]>();
function sessionsFor(patientId: string): Session[] {
  if (!sessionCache.has(patientId)) {
    const sessions: Session[] = [];
    for (const doc of sessionDocs(patientId)) {
      const result = adaptSession(doc, `${patientId}:s:${doc.completedAt}`);
      if (result.value) sessions.push(result.value);
      state.quarantined.push(...result.quarantined);
    }
    sessionCache.set(
      patientId,
      sessions.sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    );
  }
  return sessionCache.get(patientId)!;
}

const medicationCache = new Map<string, MedicationEvent[]>();
function medicationsFor(patientId: string): MedicationEvent[] {
  if (!medicationCache.has(patientId)) {
    const events: MedicationEvent[] = [];
    for (const doc of medicationDocs(patientId)) {
      const result = adaptMedication(doc, `${patientId}:m:${doc.scheduledAt}`);
      if (result.value) events.push(result.value);
      state.quarantined.push(...result.quarantined);
    }
    medicationCache.set(patientId, events);
  }
  return medicationCache.get(patientId)!;
}

const alertCache = new Map<string, Alert[]>();
function alertsFor(patientId: string): Alert[] {
  if (!alertCache.has(patientId)) {
    const alerts: Alert[] = [];
    let index = 0;
    for (const doc of alertDocs(patientId)) {
      index += 1;
      const result = adaptAlert(doc, `a-${patientId}-${index}`);
      if (result.value) alerts.push(result.value);
      state.quarantined.push(...result.quarantined);
    }
    alertCache.set(patientId, alerts);
  }
  return alertCache.get(patientId)!;
}

const deviceCache = new Map<string, DeviceHealth>();
function deviceFor(patientId: string): DeviceHealth {
  if (!deviceCache.has(patientId)) {
    const result = adaptDevice(deviceDocs(patientId), `d-${patientId}`);
    if (result.value) deviceCache.set(patientId, result.value);
    state.quarantined.push(...result.quarantined);
    // A missing device doc must not render as zeros.
    if (!deviceCache.has(patientId)) {
      deviceCache.set(patientId, {
        patientId,
        battery: null,
        storageFreeGb: null,
        pendingQueue: null,
        oldestQueueHours: null,
        modelVersion: null,
        modelChecksum: 'unavailable',
        speechHealth: 'not reported',
        lastSync: 'unknown',
      });
    }
  }
  return deviceCache.get(patientId)!;
}

const auditCache = new Map<string, AuditEvent[]>();
function auditFor(patientId: string): AuditEvent[] {
  if (!auditCache.has(patientId)) {
    const events: AuditEvent[] = [];
    let index = 0;
    for (const doc of auditDocs(patientId)) {
      index += 1;
      const result = adaptAudit(doc, `log-${patientId}-${index}`);
      if (result.value) events.push(result.value);
      state.quarantined.push(...result.quarantined);
    }
    auditCache.set(
      patientId,
      events.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    );
  }
  return auditCache.get(patientId)!;
}

// The mock repository implements only the DashboardRepository interface.
// The doctor identity belongs to the dependency seam, not the data layer.
export const mockRepository: DashboardRepository = {
  patients: async () => later(adaptedPatients),

  trends: async (query: TrendQuery) => {
    assertAssignment(query.patientId);
    const all = trendsFor(query.patientId);
    const window = fixtureDays().slice(-query.days);
    let points = all.filter((p) => window.includes(p.date));
    if (query.domain) {
      points = points.filter((p) => p[query.domain!] !== null || p.state === 'awaiting_sync');
    }
    return later(points);
  },

  sessions: async (query: SessionQuery) => {
    assertAssignment(query.patientId);
    const all = sessionsFor(query.patientId);
    let ordered = all;
    if (query.before) ordered = ordered.filter((s) => s.completedAt < (query.before as string));
    const items = ordered.slice(0, query.pageSize);
    const nextCursor = ordered.length > query.pageSize ? items[items.length - 1].completedAt : null;
    return later({ items, nextCursor });
  },

  medications: async (query) => {
    assertAssignment(query.patientId);
    const all = medicationsFor(query.patientId);
    let events = all;
    if (query.patientId === awaitingSyncPatient) {
      events = all.map((m) => (m.state === 'scheduled' ? { ...m, state: 'awaiting_sync' } : m));
    }
    const start = query.cursor ? events.findIndex((e) => e.id === query.cursor) + 1 : 0;
    const items = events.slice(start, start + query.pageSize);
    const nextCursor = start + query.pageSize < events.length ? items[items.length - 1].id : null;
    return later({ items, nextCursor });
  },

  alerts: async (query) => {
    assertAssignment(query.patientId);
    const all = alertsFor(query.patientId);
    const start = query.cursor ? all.findIndex((e) => e.id === query.cursor) + 1 : 0;
    const items = all.slice(start, start + query.pageSize);
    const nextCursor = start + query.pageSize < all.length ? items[items.length - 1].id : null;
    return later({ items, nextCursor });
  },

  device: async (patientId) => {
    assertAssignment(patientId);
    return later(deviceFor(patientId));
  },

  audit: async (query: AuditQuery) => {
    assertAssignment(query.patientId);
    const all = auditFor(query.patientId);
    let filtered = all;
    if (query.result) filtered = filtered.filter((e) => e.result === query.result);
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (e) => e.action.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q),
      );
    }
    const start = query.cursor ? filtered.findIndex((e) => e.id === query.cursor) + 1 : 0;
    const items = filtered.slice(start, start + query.pageSize);
    const nextCursor = start + query.pageSize < filtered.length ? items[items.length - 1].id : null;
    return later({ items, nextCursor });
  },

  languagePack: async (patientId) => {
    assertAssignment(patientId);
    const doc = patientDocs[patientIds.indexOf(patientId as (typeof patientIds)[number])];
    const language = doc?.preferredLanguage ?? 'Not reported';
    return later({
      language,
      packVersion: patientId === 'patient-1103' ? 'pack 2026.06' : 'pack 2026.09',
      checksum: (patientId === 'patient-1103' ? 'unavailable' : 'verified') as 'verified' | 'unavailable',
      lastSync: patientId === 'patient-1103' ? null : fixtureDays()[28],
    } satisfies LanguagePackHealth);
  },

  quarantined: async (patientId?: string) =>
    later(patientId === undefined ? state.quarantined.filter((q) => !q.patientUid) : quarantinedFor(patientId)),

  recordAudioAttempt: async (patientId, sessionId, outcome) => {
    assertAssignment(patientId);
    // Appends the audited attempt to the in-memory history so the Audit
    // view reflects audio actions the doctor takes during the session. The
    // record contains actor, patient, action, and outcome only; never the
    // signed URL or audio bytes.
    const events = auditFor(patientId);
    events.unshift({
      id: `log-${patientId}-audio-${Date.now()}`,
      patientId,
      timestamp: new Date().toISOString(),
      actor: doctorIdentity.name,
      role: 'doctor',
      action: `Protected audio play attempt (${sessionId})`,
      result: outcome,
    });
    auditCache.set(patientId, events);
  },

  acknowledgeAlert: async (patientId, _alertId) => {
    assertAssignment(patientId);
    // The mock records the request optimistically; views always message that
    // server confirmation is required before the state change is authoritative.
  },

  requestAlertEscalation: async (patientId) => {
    assertAssignment(patientId);
  },

  requestMedicationNote: async (patientId, _note) => {
    assertAssignment(patientId);
  },
};

export { adapterRegistry };
