import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'node:fs';

const projectId = 'dementia-local';

describe('Firestore security rules', () => {
  let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync('../firestore.rules', 'utf8') },
    });
  });

  afterAll(async () => testEnv.cleanup());

  it('protects data from unauthenticated users', async () => {
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'patients/patient-a')));
  });

  it('isolates patient data and allows only own game session creation', async () => {
    const patientA = testEnv.authenticatedContext('patient-a', { role: 'patient' }).firestore();
    await assertFails(getDoc(doc(patientA, 'patients/patient-b')));
    await assertFails(setDoc(doc(patientA, 'patients/patient-b/gameSessions/session-1'), { patientId: 'patient-b', schemaVersion: 1 }));
    await assertSucceeds(setDoc(doc(patientA, 'patients/patient-a/gameSessions/session-1'), { patientId: 'patient-a', schemaVersion: 1 }));
  });

  it('requires an explicit care-team assignment for doctor reads', async () => {
    const doctor = testEnv.authenticatedContext('doctor-1', { role: 'doctor' }).firestore();
    await assertFails(getDoc(doc(doctor, 'patients/patient-a')));
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'patients/patient-a'), { role: 'patient', displayName: 'A' });
      await setDoc(doc(context.firestore(), 'patients/patient-a/careTeam/doctor-1'), { role: 'doctor' });
    });
    await assertSucceeds(getDoc(doc(doctor, 'patients/patient-a')));
  });
});
