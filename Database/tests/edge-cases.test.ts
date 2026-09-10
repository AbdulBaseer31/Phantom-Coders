import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import fs from 'node:fs';

const projectId = 'dementia-local';

describe('Firestore security edge cases', () => {
  let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: fs.readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => testEnv.cleanup());

  async function seedPatientData() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await setDoc(doc(db, 'patients/patient-a'), {
        role: 'patient',
        displayName: 'Patient A',
      });

      await setDoc(doc(db, 'patients/patient-b'), {
        role: 'patient',
        displayName: 'Patient B',
      });

      await setDoc(
        doc(db, 'patients/patient-a/gameSessions/session-1'),
        {
          patientId: 'patient-a',
          schemaVersion: 1,
          score: 10,
        },
      );

      await setDoc(
        doc(db, 'patients/patient-a/medications/med-1'),
        {
          patientId: 'patient-a',
          schemaVersion: 1,
          name: 'Medication A',
        },
      );
    });
  }

  beforeAll(async () => {
    await seedPatientData();
  });

  it('denies patient A from updating patient B', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      updateDoc(doc(patientA, 'patients/patient-b'), {
        displayName: 'Hacked',
      }),
    );
  });

  it('denies patient A from deleting patient B', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      deleteDoc(doc(patientA, 'patients/patient-b')),
    );
  });

  it('denies a patient from changing their role to doctor', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      updateDoc(doc(patientA, 'patients/patient-a'), {
        role: 'doctor',
      }),
    );
  });

  it('denies a patient from changing their role to admin', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      updateDoc(doc(patientA, 'patients/patient-a'), {
        role: 'admin',
      }),
    );
  });

  it('allows a patient to update their own patient document while remaining a patient', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertSucceeds(
      updateDoc(doc(patientA, 'patients/patient-a'), {
        role: 'patient',
        displayName: 'Updated Name',
      }),
    );
  });

  it('denies creation of another patient document', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(doc(patientA, 'patients/patient-b'), {
        role: 'patient',
        displayName: 'Fake Patient',
      }),
    );
  });

  it('denies game session creation when patientId is missing', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(
        doc(patientA, 'patients/patient-a/gameSessions/missing-patient'),
        {
          schemaVersion: 1,
        },
      ),
    );
  });

  it('denies game session creation with wrong schemaVersion', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(
        doc(patientA, 'patients/patient-a/gameSessions/wrong-version'),
        {
          patientId: 'patient-a',
          schemaVersion: 2,
        },
      ),
    );
  });

  it('denies game session creation when schemaVersion is a string', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(
        doc(patientA, 'patients/patient-a/gameSessions/string-version'),
        {
          patientId: 'patient-a',
          schemaVersion: '1',
        },
      ),
    );
  });

  it('denies patients from updating game sessions', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      updateDoc(
        doc(patientA, 'patients/patient-a/gameSessions/session-1'),
        {
          score: 999999,
        },
      ),
    );
  });

  it('denies patients from deleting game sessions', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      deleteDoc(
        doc(patientA, 'patients/patient-a/gameSessions/session-1'),
      ),
    );
  });

  it('denies patient A from creating medication for patient B', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(
        doc(patientA, 'patients/patient-b/medications/med-attack'),
        {
          patientId: 'patient-b',
          schemaVersion: 1,
          name: 'Unauthorized',
        },
      ),
    );
  });

  it('denies medication creation without patientId', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(
        doc(patientA, 'patients/patient-a/medications/missing-patient'),
        {
          schemaVersion: 1,
          name: 'Medication',
        },
      ),
    );
  });

  it('denies medication creation with wrong schemaVersion', async () => {
    const patientA = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(
        doc(patientA, 'patients/patient-a/medications/wrong-version'),
        {
          patientId: 'patient-a',
          schemaVersion: 2,
          name: 'Medication',
        },
      ),
    );
  });

  it('denies doctor from writing to care team', async () => {
    const doctor = testEnv
      .authenticatedContext('doctor-2', { role: 'doctor' })
      .firestore();

    await assertFails(
      setDoc(
        doc(
          doctor,
          'patients/patient-a/careTeam/doctor-2',
        ),
        {
          role: 'doctor',
        },
      ),
    );
  });

  it('denies non-admin from writing language packs', async () => {
    const patient = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(
        doc(patient, 'languagePacks/en'),
        {
          name: 'Malicious Pack',
        },
      ),
    );
  });

  it('denies non-admin from writing users', async () => {
    const patient = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(
        doc(patient, 'users/patient-b'),
        {
          role: 'admin',
        },
      ),
    );
  });

  it('denies non-admin from writing alerts', async () => {
    const patient = testEnv
      .authenticatedContext('patient-a', { role: 'patient' })
      .firestore();

    await assertFails(
      setDoc(
        doc(patient, 'alerts/alert-attack'),
        {
          patientId: 'patient-a',
          message: 'Unauthorized alert',
        },
      ),
    );
  });

  it('denies access to a missing patient document for an unrelated user', async () => {
    const user = testEnv
      .authenticatedContext('random-user', { role: 'patient' })
      .firestore();

    await assertFails(
      getDoc(doc(user, 'patients/non-existent-patient')),
    );
  });
});