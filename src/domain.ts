export const CURRENT_SCHEMA_VERSION = 1;

export type UserRole = 'patient' | 'doctor' | 'admin';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Patient {
  id: string;
  displayName: string;
  email?: string;
  role: 'patient';
  doctorIds: string[];
  fcmTokens: string[];
  lastActivityAt?: Date;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: number;
}

export interface GameSession {
  id: string;
  patientId: string;
  gameType: string;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  schemaVersion: number;
}

export interface Alert {
  id: string;
  patientId: string;
  type: 'WELFARE_INACTIVITY' | string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  createdAt: Date;
  resolvedAt?: Date;
  schemaVersion: number;
}

export interface MedicationEvent {
  id: string;
  patientId: string;
  medicationName: string;
  scheduledAt: Date;
  takenAt?: Date;
  status: 'scheduled' | 'taken' | 'missed';
  schemaVersion: number;
}

export interface PatientRepository {
  get(patientId: string): Promise<Patient | null>;
  listInactive(cutoff: Date, limit: number): Promise<Patient[]>;
  save(patient: Patient): Promise<void>;
}

export interface GameSessionRepository {
  create(session: Omit<GameSession, 'schemaVersion'>): Promise<GameSession>;
  get(sessionId: string): Promise<GameSession | null>;
}

export interface AlertRepository {
  hasActiveWelfareAlert(patientId: string): Promise<boolean>;
  create(alert: Omit<Alert, 'id' | 'schemaVersion'>): Promise<Alert>;
}

export interface MedicationRepository {
  create(event: Omit<MedicationEvent, 'schemaVersion'>): Promise<MedicationEvent>;
}

export interface StorageService {
  getAudioDownloadUrl(patientId: string, fileName: string): Promise<string>;
}

export interface NotificationService {
  sendFcm(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void>;

  simulateSms(
    patientId: string,
    body: string,
  ): Promise<void>;

  simulateEmail(
    patientId: string,
    subject: string,
    body: string,
  ): Promise<void>;
}


