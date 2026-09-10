// Canonical domain vocabulary shared by the dashboard frontend.
// Monitoring is never diagnosis: wording constants keep clinical safety language
// consistent across every view instead of scattering copy through components.

export type Severity = 'high' | 'medium' | 'low';
export type SyncState = 'current' | 'awaiting_sync' | 'offline' | 'unknown';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'unknown';
// 'scheduled' matches the backend's default unreported medication state.
export type MedicationState = 'taken' | 'snoozed' | 'unable' | 'missed' | 'scheduled' | 'awaiting_sync';
export type CognitiveDomain = 'memory' | 'attention' | 'language';
// 'unknown' covers documents with no audio metadata at all.
export type AudioAvailability = 'available' | 'unavailable' | 'denied' | 'unknown';
export type DataQuality = 'complete' | 'partial' | 'legacy' | 'quarantined' | 'unavailable';

export interface Patient {
  id: string;
  name: string;
  // The backend stores no age/pronouns: views render "Not reported".
  age: number | null;
  pronouns: string | null;
  clinic: string;
  careTeam: string[];
  lastActivity: string;
  lastSync: string;
  syncState: SyncState;
  // -1 encodes "alert count not reported" so the UI can show "Not reported"
  // instead of a confident "None".
  activeAlerts: number;
  adherence7: number | null;
  sessions7: number | null;
  device: string;
  language: string;
  welfareState: 'no alert' | 'verification requested' | 'acknowledged' | 'unknown';
  // True when the signed-in doctor's care-team assignment for this patient
  // has been revoked: the roster shows the identity row (so the doctor knows
  // the patient exists) but all clinical detail queries are denied.
  assignmentRevoked: boolean;
}

export interface TrendPoint {
  date: string;
  memory: number | null;
  attention: number | null;
  language: number | null;
  latency: number | null;
  state?: SyncState;
}

export interface SessionItem {
  prompt: string;
  response: string;
  correct: boolean | null;
  attempts: number;
  hints: number;
  ms: number;
}

export interface Session {
  id: string;
  patientId: string;
  completedAt: string;
  game: string;
  // null means the source document did not report a cognitive domain.
  domain: CognitiveDomain | null;
  score: number | null;
  latency: number | null;
  attempts: number;
  hints: number;
  difficulty: string | null;
  schemaVersion: string;
  dataQuality: DataQuality;
  audio: AudioAvailability;
  items: SessionItem[];
}

export interface MedicationEvent {
  id: string;
  patientId: string;
  medicine: string;
  scheduledAt: string;
  // The backend records the action time in `takenAt`; a missing value with a
  // 'scheduled' state means "not yet reported", distinct from missed.
  actionAt?: string;
  state: MedicationState;
  note?: string;
}

export interface Alert {
  id: string;
  patientId: string;
  // The backend alert vocabulary: WELFARE_INACTIVITY is the only automated
  // type today; unknown types render as "Unmapped signal", never re-attributed.
  kind: 'Welfare check' | 'Device' | 'Medication' | 'Unmapped signal';
  severity: Severity;
  createdAt: string;
  status: AlertStatus;
  message: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  duplicateOf?: string;
}

export interface DeviceHealth {
  patientId: string;
  battery: number | null;
  storageFreeGb: number | null;
  pendingQueue: number | null;
  oldestQueueHours: number | null;
  modelVersion: string | null;
  modelChecksum: 'verified' | 'unavailable';
  speechHealth: 'healthy' | 'needs review' | 'not reported';
  lastSync: string;
}

export interface AuditEvent {
  id: string;
  patientId: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  result: 'allowed' | 'denied' | 'requested' | 'unreported';
}

export interface LanguagePackHealth {
  language: string;
  packVersion: string | null;
  checksum: 'verified' | 'unavailable';
  lastSync: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

// Query contracts that mirror the paginated, filtered server queries the
// production backend must expose. The mock repository implements the same
// shapes so swapping implementations does not change any view.
export interface SessionQuery {
  patientId: string;
  before?: string;
  cursor?: string;
  pageSize: number;
}

export interface AuditQuery {
  patientId: string;
  result?: 'allowed' | 'denied' | 'requested';
  search?: string;
  cursor?: string;
  pageSize: number;
}

export interface TrendQuery {
  patientId: string;
  days: 7 | 30;
  domain?: CognitiveDomain;
}

export interface AlertQuery {
  patientId: string;
  cursor?: string;
  pageSize: number;
}

export interface MedicationQuery {
  patientId: string;
  cursor?: string;
  pageSize: number;
}

export class AuthorizationError extends Error {
  constructor(message = 'Your doctor assignment no longer includes this patient record.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

import type { QuarantinedDocument } from '../adapters/documents';

// The single seam where the real backend implementation plugs in. Every view
// consumes these interfaces only, never a raw document. The mock and the
// Firebase implementation both satisfy this contract.
export interface DashboardRepository {
  patients(): Promise<Patient[]>;
  trends(query: TrendQuery): Promise<TrendPoint[]>;
  sessions(query: SessionQuery): Promise<Page<Session>>;
  medications(query: MedicationQuery): Promise<Page<MedicationEvent>>;
  alerts(query: AlertQuery): Promise<Page<Alert>>;
  device(patientId: string): Promise<DeviceHealth>;
  audit(query: AuditQuery): Promise<Page<AuditEvent>>;
  languagePack(patientId: string): Promise<LanguagePackHealth>;
  // Documents withheld by schema validation for this patient (or clinic-wide
  // roster entries when no patient is selected). Surfaced for transparency;
  // quarantined content is never rendered as clinical information.
  quarantined(patientId?: string): Promise<QuarantinedDocument[]>;
  // Records that the doctor attempted a protected-audio action. The real
  // implementation writes the audited event server-side; it must never
  // record the signed URL or audio bytes.
  recordAudioAttempt(patientId: string, sessionId: string, outcome: 'allowed' | 'denied'): Promise<void>;
  // Persisted dashboard actions that require server confirmation in the real
  // implementation. The mock records them locally; the Firebase repository
  // writes through Firestore where rules allow, or reports unsupported.
  acknowledgeAlert(alertId: string, patientId: string): Promise<void>;
  requestAlertEscalation(alertId: string, patientId: string): Promise<void>;
  requestMedicationNote(patientId: string, note: string): Promise<void>;
}

export interface AudioPlaybackRequest {
  session: Session;
}

export type AudioPlaybackResult = { durationSec: number };

export interface AudioPlaybackService {
  request(request: AudioPlaybackRequest): Promise<AudioPlaybackResult>;
}
