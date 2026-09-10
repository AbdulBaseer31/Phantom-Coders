import { describe, expect, it } from 'vitest';
import {
  adaptAlert,
  adaptAudit,
  adaptDevice,
  adaptMedication,
  adaptPatient,
  adaptSession,
  adaptTrendPoint,
} from './registry';
import type {
  RawAlertDoc,
  RawAuditDoc,
  RawDeviceDoc,
  RawGameSessionDoc,
  RawMedicationDoc,
  RawPatientDoc,
  RawTrendDayDoc,
} from './documents';

const patient: RawPatientDoc = {
  schemaVersion: 1,
  displayName: 'Test Patient',
  age: 70,
  pronouns: 'she/her',
  clinic: 'North Clinic',
  doctorIds: ['Dr. A (doctor)'],
  lastActivityAt: '2026-09-07T08:00:00+05:30',
  lastSyncAt: '2026-09-07T08:10:00+05:30',
  deviceLabel: 'Tablet 1',
  preferredLanguage: 'Hindi',
};

describe('adapter registry', () => {
  it('maps a patient and defaults missing adherence to null, never zero', () => {
    const result = adaptPatient(patient, 'p-1');
    expect(result.quarantined).toHaveLength(0);
    expect(result.value?.adherence7).toBeNull();
    expect(result.value?.syncState).toBe('unknown');
    expect(result.value?.assignmentRevoked).toBe(false);
  });

  it('maps a legacy v1 session with explicit legacy quality', () => {
    const doc: RawGameSessionDoc = {
      schemaVersion: 1,
      patientId: 'p-1',
      completedAt: '2026-09-01T09:00:00+05:30',
      gameType: 'Picture recall',
      score: 70,
      meanResponseMs: 1100,
      items: [{ prompt: 'Recall', response: 'Lamp', ms: 900 }],
    };
    const result = adaptSession(doc, 's-1');
    expect(result.value?.schemaVersion).toBe('v1');
    expect(result.value?.dataQuality).toBe('legacy');
    expect(result.value?.difficulty).toBeNull();
    expect(result.value?.hints).toBe(0);
  });

  it('quarantines an unsupported schema version instead of rendering it', () => {
    const doc = { ...patient, schemaVersion: 7 } as RawPatientDoc;
    const result = adaptPatient(doc, 'p-x');
    expect(result.value).toBeNull();
    expect(result.quarantined[0].reason).toBe('unsupported schema version');
    expect(result.quarantined[0].patientUid).toBeUndefined();
  });

  it('quarantines documents missing required fields', () => {
    const doc = { ...patient, displayName: '' };
    const result = adaptPatient(doc, 'p-y');
    expect(result.quarantined[0].reason).toBe('missing required field');
  });

  it('keeps missing trend scores null rather than zero', () => {
    const doc: RawTrendDayDoc = {
      schemaVersion: 1,
      patientId: 'p-1',
      date: '2026-09-05',
      deviceSynced: false,
    };
    const result = adaptTrendPoint(doc, 't-1');
    expect(result.value?.memory).toBeNull();
    expect(result.value?.attention).toBeNull();
    expect(result.value?.state).toBe('awaiting_sync');
  });

  it('defaults unknown medication status to scheduled, not taken', () => {
    const doc: RawMedicationDoc = {
      schemaVersion: 1,
      patientId: 'p-1',
      medicationName: 'Test 1 mg',
      scheduledAt: '2026-09-07T08:00:00+05:30',
      status: undefined,
    };
    const result = adaptMedication(doc, 'm-1');
    expect(result.value?.state).toBe('scheduled');
  });

  it('maps alert severity and acknowledgement metadata', () => {
    const doc: RawAlertDoc = {
      schemaVersion: 1,
      patientId: 'p-1',
      type: 'WELFARE_INACTIVITY',
      severity: 'HIGH',
      createdAt: '2026-09-06T15:00:00+05:30',
      status: 'ACKNOWLEDGED',
      message: 'Check requested.',
      acknowledgedBy: 'Dr. A',
    };
    const result = adaptAlert(doc, 'a-1');
    expect(result.value?.severity).toBe('high');
    expect(result.value?.acknowledgedBy).toBe('Dr. A');
    expect(result.value?.status).toBe('acknowledged');
    expect(result.value?.kind).toBe('Welfare check');
  });

  it('defaults device checksum to verified only when confirmed', () => {
    const base: RawDeviceDoc = {
      schemaVersion: 1,
      patientId: 'p-1',
      lastSync: '2026-09-07T08:10:00+05:30',
    };
    expect(adaptDevice({ ...base, modelChecksumVerified: false }, 'd-1').value?.modelChecksum).toBe('unavailable');
    expect(adaptDevice({ ...base, modelChecksumVerified: true }, 'd-2').value?.modelChecksum).toBe('verified');
    expect(adaptDevice(base, 'd-3').value?.battery).toBeNull();
  });

  it('maps audit results with an unreported default, never allowed', () => {
    const doc: RawAuditDoc = {
      schemaVersion: 1,
      patientId: 'p-1',
      timestamp: '2026-09-07T09:20:00+05:30',
      actor: 'Dr. A',
      role: 'doctor',
      action: 'Patient record viewed',
      result: 'weird',
    };
    const result = adaptAudit(doc, 'log-1');
    expect(result.value?.result).toBe('unreported');
  });
});
