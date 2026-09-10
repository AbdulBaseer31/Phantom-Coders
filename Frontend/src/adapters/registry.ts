// Version-adapter registry keyed by schema_version, per PLAN.md Phase 3:
// every clinical document is mapped through an adapter before a component
// receives it; missing fields become explicit null ("not reported") and
// never zero/false; unsupported versions are quarantined, not rendered.
//
// The registry is table-driven: adding a future v3 means adding one entry
// to SUPPORTED and one mapping row, not editing every adapter.
import type {
  Alert,
  AuditEvent,
  DeviceHealth,
  MedicationEvent,
  Patient,
  Session,
  TrendPoint,
} from '../domain/models';
import {
  asAlert,
  asAuditEvent,
  asDeviceHealth,
  asMedicationEvent,
  asPatient,
  asSession,
  asTrendPoint,
  type QuarantinedDocument,
  type QuarantineReason,
  type RawAlertDoc,
  type RawAuditDoc,
  type RawDeviceDoc,
  type RawGameSessionDoc,
  type RawMedicationDoc,
  type RawPatientDoc,
  type RawTrendDayDoc,
} from './documents';

export interface AdapterResult<T> {
  value: T | null;
  quarantined: QuarantinedDocument[];
}

const SUPPORTED = [1, 2] as const;

interface Mapping<Raw, Out> {
  collection: string;
  // Fields that must be present and truthy for the document to render.
  required: (keyof Raw)[];
  // Owner uid field, recorded on quarantine entries for per-patient scoping.
  ownerField?: keyof Raw;
  adapt: (doc: Raw, id: string) => Out;
}

export function makeAdapter<Raw, Out>(mapping: Mapping<Raw, Out>) {
  return (doc: Raw, id: string): AdapterResult<Out> => {
    // The backend writes schemaVersion as a number; only supported versions
    // may render, everything else is quarantined.
    const version = doc['schemaVersion' as keyof Raw] as unknown;
    const versionOk = typeof version === 'number' && (SUPPORTED as readonly number[]).includes(version);
    const missing = versionOk ? mapping.required.some((f) => !doc[f]) : false;
    if (!versionOk || missing) {
      const reason: QuarantineReason = !versionOk ? 'unsupported schema version' : 'missing required field';
      return {
        value: null,
        quarantined: [
          {
            collection: mapping.collection,
            id,
            patientUid: mapping.ownerField ? (doc[mapping.ownerField] as unknown as string | undefined) : undefined,
            reason,
            detail: !versionOk
              ? `schemaVersion ${String(version)} is not supported`
              : `required field(s) missing: ${mapping.required.filter((f) => !doc[f]).join(', ')}`,
          },
        ],
      };
    }
    return { value: mapping.adapt(doc, id), quarantined: [] };
  };
}

export const adaptPatient = makeAdapter<RawPatientDoc, Patient>({
  collection: 'patients',
  required: ['displayName'],
  adapt: asPatient,
});

export const adaptSession = makeAdapter<RawGameSessionDoc, Session>({
  collection: 'gameSessions',
  required: ['patientId', 'completedAt'],
  ownerField: 'patientId',
  adapt: asSession,
});

export const adaptTrendPoint = makeAdapter<RawTrendDayDoc, TrendPoint>({
  collection: 'telemetry',
  required: ['date'],
  ownerField: 'patientId',
  adapt: asTrendPoint,
});

export const adaptMedication = makeAdapter<RawMedicationDoc, MedicationEvent>({
  collection: 'medications',
  required: ['patientId', 'scheduledAt'],
  ownerField: 'patientId',
  adapt: asMedicationEvent,
});

export const adaptAlert = makeAdapter<RawAlertDoc, Alert>({
  collection: 'alerts',
  required: ['patientId', 'message'],
  ownerField: 'patientId',
  adapt: asAlert,
});

export const adaptDevice = makeAdapter<RawDeviceDoc, DeviceHealth>({
  collection: 'devices',
  required: ['patientId', 'lastSync'],
  ownerField: 'patientId',
  adapt: asDeviceHealth,
});

export const adaptAudit = makeAdapter<RawAuditDoc, AuditEvent>({
  collection: 'auditLogs',
  required: ['patientId', 'timestamp', 'action'],
  ownerField: 'patientId',
  adapt: asAuditEvent,
});

export const adapterRegistry = {
  supportedVersions: SUPPORTED,
  patient: adaptPatient,
  session: adaptSession,
  trend: adaptTrendPoint,
  medication: adaptMedication,
  alert: adaptAlert,
  device: adaptDevice,
  audit: adaptAudit,
} as const;
