// Deterministic de-identified fixture builders written in the SIH26003
// backend's exact document schema (schemaVersion 1, displayName, gameType,
// medicationName, takenAt, lastActivityAt/lastSyncAt, UPPER alert enums).
// The fixture set intentionally covers every required document state:
// normal, missing fields, empty, offline/awaiting-sync, malformed-but-
// quarantined, and the revoked-assignment patient.
import { CLOCK_ANCHOR as FIXTURE_ANCHOR } from '../domain/viewModels';

// Re-exported for existing tests; the domain port remains authoritative.
export { FIXTURE_ANCHOR };

// All date math uses UTC-midnight on the anchor so no UTC/IST off-by-one
// shifts fixture dates one day early.
const day = (offsetFromAnchor: number): string => {
  const [y, m, d] = FIXTURE_ANCHOR.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - offsetFromAnchor * 86400000).toISOString().slice(0, 10);
};

const at = (dayOffset: number, time: string): string => `${day(dayOffset)}T${time}:00.000Z`;

// 30 days, oldest first.
export const fixtureDays = (): string[] => Array.from({ length: 30 }, (_, i) => day(29 - i));

// UTC-midnight timestamps for Firestore seeding.
export const seedTimestamp = (dayOffset: number, time: string): Date => new Date(at(dayOffset, time));

// The doctor using this dashboard.
export const doctorIdentity = { name: 'Dr. Mira Sen', clinic: 'North Clinic' };

export const patientDocs = [
  {
    schemaVersion: 1,
    role: 'patient',
    displayName: 'Anita Rao',
    doctorIds: ['doctor-1'],
    fcmTokens: [],
    lastActivityAt: at(0, '02:12'),
    lastSyncAt: at(0, '02:40'),
    createdAt: at(400, '00:00'),
    updatedAt: at(0, '02:40'),
    // Dashboard enrichment the backend does not own.
    clinic: 'North Clinic',
    age: 72,
    pronouns: 'she/her',
    preferredLanguage: 'Hindi',
    deviceLabel: 'Tablet 14',
  },
  {
    schemaVersion: 1,
    role: 'patient',
    displayName: 'Farid Khan',
    doctorIds: ['doctor-1'],
    fcmTokens: [],
    // Device awaiting sync for two days.
    lastActivityAt: at(2, '12:40'),
    lastSyncAt: at(2, '12:40'),
    createdAt: at(400, '00:00'),
    updatedAt: at(2, '12:40'),
    clinic: 'North Clinic',
    age: 68,
    pronouns: 'he/him',
    preferredLanguage: 'Urdu',
    deviceLabel: 'Tablet 09',
  },
  {
    schemaVersion: 1,
    role: 'patient',
    displayName: 'Leela Menon',
    doctorIds: ['doctor-1'],
    fcmTokens: [],
    // Device offline since day 1: cloud data ends at the last sync.
    lastActivityAt: at(1, '04:34'),
    lastSyncAt: at(1, '04:55'),
    createdAt: at(400, '00:00'),
    updatedAt: at(1, '04:55'),
    clinic: 'South Clinic',
    age: 75,
    pronouns: 'she/her',
    preferredLanguage: 'Malayalam',
    deviceLabel: 'Tablet 17',
  },
  {
    // Legacy-shaped document for a patient whose assignment to this doctor
    // has been revoked: roster shows identity only, all clinical detail
    // queries are denied by rules. No monitoring fields are exposed.
    schemaVersion: 1,
    role: 'patient',
    displayName: 'Dev Pal',
    doctorIds: ['doctor-9'],
    fcmTokens: [],
    createdAt: at(400, '00:00'),
    updatedAt: at(300, '00:00'),
    clinic: 'South Clinic',
    age: 70,
    pronouns: 'he/him',
    preferredLanguage: 'Hindi',
    deviceLabel: 'Tablet 21',
  },
];

// The doctor's assignment to this patient has been revoked: accessing its
// clinical data must surface AuthorizationError, exercising revoked UX.
export const revokedAssignment = 'patient-1170';
// The awaiting-sync patient: the one scheduled medication event is surfaced
// as awaiting sync at the repository layer; the backend never writes awaiting_sync.
export const awaitingSyncPatient = 'patient-1088';
// Fixture patient ids mirror backend-style UIDs.
export const patientIds = ['patient-1042', 'patient-1088', 'patient-1103', 'patient-1170'] as const;

// Seeded deterministic variation, no Math.random.
const wobble = (seed: number): number => (Math.sin(seed * 12.9898) * 43758.5453) % 1;

const games = ['Picture recall', 'Sound matching', 'Word list', 'Pattern trace'] as const;

export function sessionDocs(patientUid: string): import('../adapters/documents').RawGameSessionDoc[] {
  const index = patientIds.indexOf(patientUid as (typeof patientIds)[number]);
  const base = index === 0 ? 64 : index === 1 ? 58 : 61;
  const docs: import('../adapters/documents').RawGameSessionDoc[] = [];
  for (let i = 0; i < 12; i++) {
    const w = Math.abs(wobble(i * 3 + base));
    // Sessions 0-5 fall within the last 7 days; 6-11 span days 8-13.
    const dayOffset = i < 6 ? i : Math.floor((i - 6) / 2) + 7;
    const hour = String(8 + (i % 4)).padStart(2, '0');
    const doc: import('../adapters/documents').RawGameSessionDoc = {
      schemaVersion: 1,
      patientId: patientUid,
      gameType: games[i % games.length],
      startedAt: at(dayOffset, `${hour}:00`),
      completedAt: at(dayOffset, `${hour}:15`),
      domain: (['memory', 'attention', 'language'] as const)[i % 3],
      score: Math.min(97, Math.round(base + i * 1.5 + w * 8)),
      meanResponseMs: Math.round(900 + i * 22 + w * 240),
      attempts: 1 + (i % 3),
      hints: i % 2,
      adaptiveLevel: i < 4 ? 'adaptive level 3' : 'adaptive level 2',
      audioStatus: i === 1 ? 'unavailable' : i === 2 ? 'denied' : 'available',
      items: [
        {
          prompt: 'Recall the object shown earlier',
          response: i % 2 === 0 ? 'Lamp' : 'Tree',
          correct: i % 2 === 0,
          ms: Math.round(820 + i * 30 + w * 200),
          attempts: 1,
          hints: 0,
        },
        {
          prompt: 'Choose the matching sound',
          response: 'Selected option B',
          correct: i % 4 !== 3,
          ms: Math.round(1000 + i * 25 + w * 180),
          attempts: 1 + (i % 2),
          hints: i % 2,
        },
      ],
    };
    // One legacy-shaped session per patient: enrichment fields absent.
    if (i === 9) {
      delete doc.adaptiveLevel;
      delete doc.hints;
      delete doc.domain;
      delete doc.meanResponseMs;
    }
    // Patients with unsynced devices: sessions after the last successful
    // sync never reached the cloud and are absent from the repository.
    if (patientUid === 'patient-1103' && (doc.completedAt as string) > at(1, '05:00')) continue;
    if (patientUid === 'patient-1088' && (doc.completedAt as string) > at(2, '13:00')) continue;
    docs.push(doc);
  }
  // One malformed document with an unsupported schema version: the adapter
  // quarantines it; it must never render as valid clinical data.
  docs.push({
    schemaVersion: 7 as number,
    patientId: patientUid,
    completedAt: at(4, '06:00'),
    gameType: 'Unknown game',
    score: 88,
  } as import('../adapters/documents').RawGameSessionDoc);
  return docs;
}

export function medicationDocs(patientUid: string): import('../adapters/documents').RawMedicationDoc[] {
  const medicines = ['Donepezil 5 mg', 'Vitamin D3', 'Metformin 500 mg'] as const;
  const docs: import('../adapters/documents').RawMedicationDoc[] = [];
  for (let i = 0; i < 30; i++) {
    const medicine = medicines[i % medicines.length];
    const hour = i % 2 === 0 ? '03:30' : '15:30';
    const doc: import('../adapters/documents').RawMedicationDoc = {
      schemaVersion: 1,
      patientId: patientUid,
      medicationName: medicine,
      scheduledAt: at(i, hour),
    };
    const w = Math.abs(wobble(i * 2 + 3));
    if (patientUid === 'patient-1088' && i === 3) {
      // No status: renders as "Scheduled", i.e. not yet reported. Awaiting
      // sync is a dashboard enrichment state, not a backend value.
      doc.status = 'scheduled';
    } else if (w > 0.85) {
      doc.status = 'snoozed';
      doc.takenAt = at(i, '15:55');
    } else if (w > 0.74) {
      doc.status = 'unable';
      doc.takenAt = at(i, `${hour.split(':')[0]}:45`);
      doc.note = 'Patient reported difficulty swallowing.';
    } else if (w > 0.62) {
      doc.status = 'missed';
      doc.takenAt = at(i, '17:00');
    } else {
      doc.status = 'taken';
      doc.takenAt = at(i, `${hour.split(':')[0]}:40`);
    }
    docs.push(doc);
  }
  return docs;
}

export function alertDocs(patientUid: string): import('../adapters/documents').RawAlertDoc[] {
  const docs: import('../adapters/documents').RawAlertDoc[] = [];
  if (patientUid === 'patient-1042') {
    docs.push(
      {
        schemaVersion: 1,
        patientId: patientUid,
        type: 'WELFARE_INACTIVITY',
        severity: 'HIGH',
        status: 'ACTIVE',
        message: 'No activity or sync has been recorded for more than 24 hours.',
        createdAt: at(0, '03:45'),
      },
      // De-duplicated heartbeat collapsed into the first alert by the server.
      {
        schemaVersion: 1,
        patientId: patientUid,
        type: 'WELFARE_INACTIVITY',
        severity: 'HIGH',
        status: 'ACTIVE',
        message: 'Repeat welfare-check signal collapsed by server de-duplication.',
        createdAt: at(0, '04:10'),
        duplicateOf: `a-${patientUid}-1`,
      },
    );
  }
  if (patientUid === 'patient-1103') {
    docs.push(
      {
        schemaVersion: 1,
        patientId: patientUid,
        type: 'DEVICE',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        message: 'Device storage threshold reached. Verify device availability through the care workflow.',
        createdAt: at(1, '10:30'),
      },
      {
        schemaVersion: 1,
        patientId: patientUid,
        type: 'MEDICATION',
        severity: 'LOW',
        status: 'ACKNOWLEDGED',
        message: 'One medication event was not reported at the expected time.',
        createdAt: at(4, '03:30'),
        acknowledgedBy: doctorIdentity.name,
        acknowledgedAt: at(4, '05:30'),
      },
    );
  }
  return docs;
}

export function deviceDocs(patientUid: string): import('../adapters/documents').RawDeviceDoc {
  const common = { schemaVersion: 1 as const, patientId: patientUid, lastSync: at(0, '02:40') };
  if (patientUid === 'patient-1088') {
    return {
      ...common,
      batteryPct: 55,
      storageFreeGb: 5.8,
      pendingQueue: 4,
      oldestQueueHours: 49,
      modelPackVersion: 'pack 2026.09',
      modelChecksumVerified: false,
      speechInferenceHealth: 'healthy',
    };
  }
  if (patientUid === 'patient-1103') {
    return {
      ...common,
      batteryPct: 34,
      storageFreeGb: 0.4,
      pendingQueue: 2,
      oldestQueueHours: 12,
      modelPackVersion: 'pack 2026.06',
      modelChecksumVerified: true,
      speechInferenceHealth: 'needs review',
    };
  }
  return {
    ...common,
    batteryPct: 76,
    storageFreeGb: 11.2,
    pendingQueue: 0,
    modelPackVersion: 'pack 2026.09',
    modelChecksumVerified: true,
    speechInferenceHealth: 'healthy',
  };
}

export function auditDocs(patientUid: string): import('../adapters/documents').RawAuditDoc[] {
  const actions = [
    'Patient record viewed',
    'Alert acknowledgement requested',
    'Session detail viewed',
    'Protected audio play attempt',
    'Authorized export requested',
  ];
  return Array.from({ length: 24 }, (_, i) => ({
    schemaVersion: 1 as const,
    patientId: patientUid,
    timestamp: at(Math.floor(i / 4), `${String(9 + (i % 8)).padStart(2, '0')}:50`),
    actor: i % 7 === 3 ? 'Dr. Arjun Nair' : doctorIdentity.name,
    role: 'doctor',
    action: actions[i % actions.length],
    result: (i === 9 ? 'denied' : i === 4 || i === 19 ? 'requested' : 'allowed') as string,
  }));
}

// Daily telemetry: the backend does not own a trends collection, so the
// dashboard derives trajectories from the sessions themselves; the mock
// mirrors that derivation by exposing per-day session aggregates.
export function trendDocs(patientUid: string): import('../adapters/documents').RawTrendDayDoc[] {
  const base = patientUid === 'patient-1042' ? 62 : patientUid === 'patient-1088' ? 55 : 58;
  return fixtureDays().map((date, i) => {
    const w = Math.abs(wobble(i + base));
    const doc: import('../adapters/documents').RawTrendDayDoc = {
      schemaVersion: 1,
      patientId: patientUid,
      date,
      meanResponseMs: Math.round(1050 - i * 6 + w * 160),
      deviceSynced: true,
    };
    // Deterministic offline gap day per patient: renders as awaiting sync
    // (null), never zero.
    const gapDay = patientUid === 'patient-1088' ? 24 : patientUid === 'patient-1103' ? 25 : 21;
    if (i !== gapDay) {
      doc.memory = Math.min(98, Math.round(base + i * 0.4 + w * 6));
      doc.attention = Math.min(96, Math.round(base - 3 + i * 0.35 + w * 5));
      doc.language = Math.min(95, Math.round(base - 1 + i * 0.3 + w * 4));
    } else {
      doc.deviceSynced = false;
    }
    return doc;
  });
}
