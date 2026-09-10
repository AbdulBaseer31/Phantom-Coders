// Raw Firestore-shaped documents matching the SIH26003 backend contract
// (github.com/Chennuru-Bhavesh/SIH): schemaVersion 1, UPPER-case alert
// enums, displayName, gameType, medicationName, takenAt, lastActivityAt,
// lastSyncAt. These are the ONLY types the adapters consume; views never
// see them.
import type {
  Alert,
  AuditEvent,
  CognitiveDomain,
  DeviceHealth,
  MedicationEvent,
  Patient,
  Session,
  TrendPoint,
} from '../domain/models';

// The backend writes schemaVersion as a number (CURRENT_SCHEMA_VERSION = 1).
export type SchemaVersion = number;

export interface RawPatientDoc {
  schemaVersion: SchemaVersion;
  role?: string;
  displayName?: string;
  doctorIds?: string[];
  fcmTokens?: string[];
  lastActivityAt?: string | Date;
  lastSyncAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // Dashboard enrichment fields the backend does not own; absent in real data.
  clinic?: string;
  age?: number;
  pronouns?: string;
  preferredLanguage?: string;
  deviceLabel?: string;
}

export interface RawGameSessionDoc {
  schemaVersion: SchemaVersion;
  patientId: string;
  gameType?: string;
  startedAt?: string | Date;
  completedAt?: string | Date;
  score?: number;
  // Enrichment fields the backend does not own; absent means "not reported".
  domain?: string;
  meanResponseMs?: number;
  attempts?: number;
  hints?: number;
  adaptiveLevel?: string;
  audioStatus?: string;
  audioFile?: string;
  items?: { prompt: string; response: string; correct?: boolean; ms: number; attempts?: number; hints?: number }[];
}

export interface RawMedicationDoc {
  schemaVersion: SchemaVersion;
  patientId: string;
  medicationName?: string;
  scheduledAt?: string | Date;
  takenAt?: string | Date;
  status?: 'scheduled' | 'taken' | 'missed' | 'snoozed' | 'unable';
  note?: string;
}

export interface RawAlertDoc {
  schemaVersion: SchemaVersion;
  // The backend's rules read `patientId` on alerts; some functions/tests also
  // write `patientUid`. Accept both so either shape renders.
  patientId?: string;
  patientUid?: string;
  type?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  status?: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  message?: string;
  createdAt?: string | Date;
  resolvedAt?: string | Date;
  acknowledgedBy?: string;
  acknowledgedAt?: string | Date;
  duplicateOf?: string;
}

export interface RawDeviceDoc {
  schemaVersion: SchemaVersion;
  patientId: string;
  batteryPct?: number;
  storageFreeGb?: number;
  pendingQueue?: number;
  oldestQueueHours?: number;
  modelPackVersion?: string;
  modelChecksumVerified?: boolean;
  speechInferenceHealth?: string;
  lastSync?: string | Date;
}

export interface RawAuditDoc {
  schemaVersion: SchemaVersion;
  patientId: string;
  timestamp: string | Date;
  actor: string;
  role: string;
  action: string;
  result?: string;
}

export interface RawTrendDayDoc {
  schemaVersion: SchemaVersion;
  patientId: string;
  date: string;
  memory?: number;
  attention?: number;
  language?: number;
  meanResponseMs?: number;
  deviceSynced?: boolean;
}

export type QuarantineReason =
  | 'unsupported schema version'
  | 'missing required field'
  | 'invalid field value';

export interface QuarantinedDocument {
  collection: string;
  id: string;
  patientUid?: string;
  reason: QuarantineReason;
  detail: string;
}

// Timestamps arrive as ISO strings, Firestore Timestamps (ISO strings after
// JSON), or JS Dates; normalize to an ISO string for display formatting.
export function toISO(value: string | Date | undefined | null): string {
  if (!value) return 'unknown';
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function asPatient(p: RawPatientDoc, id: string): Patient {
  const syncStates = ['current', 'awaiting_sync', 'offline', 'unknown'] as const;
  const lastActivity = toISO(p.lastActivityAt);
  const lastSync = toISO(p.lastSyncAt);
  const language = p.preferredLanguage ?? 'Not reported';
  return {
    id,
    name: p.displayName ?? 'Not reported',
    age: p.age ?? null,
    pronouns: p.pronouns ?? null,
    clinic: p.clinic ?? 'Not reported',
    careTeam: p.doctorIds ?? [],
    lastActivity,
    lastSync,
    syncState: syncStates.find((s) => s === (p as { syncState?: string }).syncState) ?? 'unknown',
    // Missing alert count must stay unknown ("Not reported"), never "None".
    activeAlerts: (p as { alertCount?: number }).alertCount ?? -1,
    adherence7: (p as { adherence7?: number }).adherence7 ?? null,
    sessions7: (p as { sessions7?: number }).sessions7 ?? null,
    device: p.deviceLabel ?? 'Not reported',
    language,
    welfareState: 'unknown',
    assignmentRevoked: false,
  };
}

const domainValues: CognitiveDomain[] = ['memory', 'attention', 'language'];

export function asSession(doc: RawGameSessionDoc, id: string): Session {
  // A missing/unknown domain must not be silently attributed to memory: the
  // session renders with an explicit "not reported" domain instead.
  const domain = domainValues.find((d) => d === doc.domain?.toLowerCase()) ?? null;
  const items = (doc.items ?? []).map((item) => ({
    prompt: item.prompt,
    response: item.response,
    correct: item.correct ?? null,
    attempts: item.attempts ?? 1,
    hints: item.hints ?? 0,
    ms: item.ms,
  }));
  const audio =
    doc.audioStatus === 'available' || doc.audioStatus === 'denied' || doc.audioStatus === 'unavailable'
      ? doc.audioStatus
      : 'unknown';
  return {
    id,
    patientId: doc.patientId,
    completedAt: toISO(doc.completedAt ?? doc.startedAt),
    game: doc.gameType ?? 'Session',
    domain,
    score: doc.score ?? null,
    latency: doc.meanResponseMs ?? null,
    attempts: doc.attempts ?? items.length,
    hints: doc.hints ?? items.reduce((a, i) => a + i.hints, 0),
    difficulty: doc.adaptiveLevel ?? null,
    schemaVersion: `v${doc.schemaVersion}`,
    dataQuality:
      doc.score === undefined || doc.completedAt === undefined
        ? 'partial'
        : doc.schemaVersion === 1
          ? 'legacy'
          : 'complete',
    audio,
    items,
  };
}

export function asTrendPoint(doc: RawTrendDayDoc): TrendPoint {
  return {
    date: doc.date,
    memory: doc.memory ?? null,
    attention: doc.attention ?? null,
    language: doc.language ?? null,
    latency: doc.meanResponseMs ?? null,
    state: doc.deviceSynced === false ? 'awaiting_sync' : undefined,
  };
}

export function asMedicationEvent(doc: RawMedicationDoc, id: string): MedicationEvent {
  const states = ['taken', 'snoozed', 'unable', 'missed', 'scheduled', 'awaiting_sync'] as const;
  const state = states.find((s) => s === doc.status) ?? 'scheduled';
  return {
    id,
    patientId: doc.patientId,
    medicine: doc.medicationName ?? 'Not reported',
    scheduledAt: toISO(doc.scheduledAt),
    actionAt: doc.takenAt ? toISO(doc.takenAt) : undefined,
    state,
    note: doc.note,
  };
}

const alertKindMap: Record<string, Alert['kind']> = {
  WELFARE_INACTIVITY: 'Welfare check',
  WELFARE_CHECK: 'Welfare check',
  DEVICE: 'Device',
  MEDICATION: 'Medication',
};

export function asAlert(doc: RawAlertDoc, id: string): Alert {
  const severities = ['high', 'medium', 'low'] as const;
  const statuses = ['active', 'acknowledged', 'resolved', 'unknown'] as const;
  const severityLower = typeof doc.severity === 'string' ? doc.severity.toLowerCase() : undefined;
  const statusLower = typeof doc.status === 'string' ? doc.status.toLowerCase() : undefined;
  return {
    id,
    patientId: (doc.patientId ?? doc.patientUid) as string,
    // Unknown types render as an unmapped operational signal, never
    // re-attributed to a known kind.
    kind: (doc.type && alertKindMap[doc.type.toUpperCase()]) || 'Unmapped signal',
    severity: severities.find((s) => s === severityLower) ?? 'medium',
    createdAt: toISO(doc.createdAt),
    // A missing status means the server has not reported the state; render
    // it as unknown rather than confidently "active".
    status: statuses.find((s) => s === statusLower) ?? 'unknown',
    message: doc.message ?? 'No alert context was reported.',
    acknowledgedBy: doc.acknowledgedBy,
    acknowledgedAt: doc.acknowledgedAt ? toISO(doc.acknowledgedAt) : undefined,
    duplicateOf: doc.duplicateOf,
  };
}

export function asDeviceHealth(doc: RawDeviceDoc): DeviceHealth {
  const speech = ['healthy', 'needs review', 'not reported'] as const;
  return {
    patientId: doc.patientId,
    battery: doc.batteryPct ?? null,
    storageFreeGb: doc.storageFreeGb ?? null,
    pendingQueue: doc.pendingQueue ?? null,
    oldestQueueHours: doc.oldestQueueHours ?? null,
    modelVersion: doc.modelPackVersion ?? null,
    modelChecksum: doc.modelChecksumVerified === false ? 'unavailable' : 'verified',
    speechHealth: speech.find((s) => s === doc.speechInferenceHealth) ?? 'not reported',
    lastSync: toISO(doc.lastSync),
  };
}

export function asAuditEvent(doc: RawAuditDoc, id: string): AuditEvent {
  const results = ['allowed', 'denied', 'requested'] as const;
  return {
    id,
    patientId: doc.patientId,
    timestamp: toISO(doc.timestamp),
    actor: doc.actor,
    role: doc.role,
    action: doc.action,
    // An unrecognized audit result must not render as "Allowed".
    result: (results.find((r) => r === doc.result?.toLowerCase()) ?? 'unreported') as AuditEvent['result'],
  };
}
