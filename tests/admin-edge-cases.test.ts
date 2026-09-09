import { afterAll, beforeAll, describe, it } from 'vitest';
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

describe('Firestore admin security edge cases', () => {
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

    // Seed test data using disabled rules.
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
        doc(db, 'patients/patient-a/careTeam/doctor-1'),
        {
          role: 'doctor',
        },
      );

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

      await setDoc(
        doc(db, 'languagePacks/en'),
        {
          name: 'English',
          version: 1,
        },
      );

      await setDoc(
        doc(db, 'users/patient-a'),
        {
          role: 'patient',
        },
      );

      await setDoc(
        doc(db, 'alerts/alert-1'),
        {
          patientId: 'patient-a',
          message: 'Test alert',
        },
      );
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  // ---------------------------------------------------------
  // 1. REAL ADMIN CAN DELETE PATIENT
  // ---------------------------------------------------------

  it('allows a real admin to delete a patient', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      deleteDoc(doc(admin, 'patients/patient-b')),
    );
  });

  // ---------------------------------------------------------
  // 2. REAL ADMIN CAN WRITE CARE TEAM
  // ---------------------------------------------------------

  it('allows a real admin to create a care-team assignment', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      setDoc(
        doc(admin, 'patients/patient-a/careTeam/doctor-2'),
        {
          role: 'doctor',
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // 3. REAL ADMIN CAN UPDATE GAME SESSION
  // ---------------------------------------------------------

  it('allows a real admin to update a game session', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      updateDoc(
        doc(
          admin,
          'patients/patient-a/gameSessions/session-1',
        ),
        {
          score: 999,
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // 3B. REAL ADMIN CAN DELETE GAME SESSION
  // ---------------------------------------------------------

  it('allows a real admin to delete a game session', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      deleteDoc(
        doc(
          admin,
          'patients/patient-a/gameSessions/session-1',
        ),
      ),
    );
  });

  // ---------------------------------------------------------
  // 4. REAL ADMIN CAN UPDATE MEDICATION
  // ---------------------------------------------------------

  it('allows a real admin to update medication', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      updateDoc(
        doc(
          admin,
          'patients/patient-a/medications/med-1',
        ),
        {
          name: 'Updated Medication',
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // 4B. REAL ADMIN CAN DELETE MEDICATION
  // ---------------------------------------------------------

  it('allows a real admin to delete medication', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      deleteDoc(
        doc(
          admin,
          'patients/patient-a/medications/med-1',
        ),
      ),
    );
  });

  // ---------------------------------------------------------
  // 5. REAL ADMIN CAN CREATE ALERT
  // ---------------------------------------------------------

  it('allows a real admin to create an alert', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      setDoc(
        doc(admin, 'alerts/admin-alert-1'),
        {
          patientId: 'patient-a',
          message: 'Admin-created alert',
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // 5B. REAL ADMIN CAN UPDATE ALERT
  // ---------------------------------------------------------

  it('allows a real admin to update an alert', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      updateDoc(
        doc(admin, 'alerts/alert-1'),
        {
          message: 'Updated alert',
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // 6. REAL ADMIN CAN CREATE LANGUAGE PACK
  // ---------------------------------------------------------

  it('allows a real admin to create a language pack', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      setDoc(
        doc(admin, 'languagePacks/hi'),
        {
          name: 'Hindi',
          version: 1,
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // 6B. REAL ADMIN CAN UPDATE LANGUAGE PACK
  // ---------------------------------------------------------

  it('allows a real admin to update a language pack', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      updateDoc(
        doc(admin, 'languagePacks/en'),
        {
          version: 2,
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // 7. REAL ADMIN CAN MANAGE USERS
  // ---------------------------------------------------------

  it('allows a real admin to create a user document', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      setDoc(
        doc(admin, 'users/user-new'),
        {
          role: 'patient',
        },
      ),
    );
  });

  it('allows a real admin to update a user document', async () => {
    const admin = testEnv
      .authenticatedContext('admin-1', {
        role: 'admin',
        admin: true,
      })
      .firestore();

    await assertSucceeds(
      updateDoc(
        doc(admin, 'users/patient-a'),
        {
          role: 'doctor',
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // 8. DOCTOR CANNOT FAKE ADMIN
  // ---------------------------------------------------------

  it('denies a doctor who has admin=false', async () => {
    const doctor = testEnv
      .authenticatedContext('doctor-1', {
        role: 'doctor',
        admin: false,
      })
      .firestore();

    await assertFails(
      deleteDoc(
        doc(doctor, 'patients/patient-a'),
      ),
    );
  });

  // ---------------------------------------------------------
  // 8B. DOCTOR CANNOT FAKE ADMIN CLAIM
  // ---------------------------------------------------------

  it('denies a doctor without an admin claim', async () => {
    const doctor = testEnv
      .authenticatedContext('doctor-1', {
        role: 'doctor',
      })
      .firestore();

    await assertFails(
      deleteDoc(
        doc(doctor, 'patients/patient-a'),
      ),
    );
  });

  // ---------------------------------------------------------
  // 9. PATIENT CANNOT FAKE ADMIN
  // ---------------------------------------------------------

  it('denies a patient with admin=false', async () => {
    const patient = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
        admin: false,
      })
      .firestore();

    await assertFails(
      deleteDoc(
        doc(patient, 'patients/patient-a'),
      ),
    );
  });

  // ---------------------------------------------------------
  // 9B. PATIENT CANNOT BECOME ADMIN BY CLAIM
  // ---------------------------------------------------------

  it('does not treat patient role alone as admin', async () => {
    const patient = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(patient, 'users/admin-test'),
        {
          role: 'admin',
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // 10. admin="true" STRING
  // ---------------------------------------------------------

  it('denies admin claim when admin is the string "true"', async () => {
    const fakeAdmin = testEnv
      .authenticatedContext('fake-admin-string', {
        role: 'admin',
        admin: 'true',
      })
      .firestore();

    await assertFails(
      deleteDoc(
        doc(fakeAdmin, 'patients/patient-a'),
      ),
    );
  });

  // ---------------------------------------------------------
  // 11. admin=1 NUMBER
  // ---------------------------------------------------------

  it('denies admin claim when admin is the number 1', async () => {
    const fakeAdmin = testEnv
      .authenticatedContext('fake-admin-number', {
        role: 'admin',
        admin: 1,
      })
      .firestore();

    await assertFails(
      deleteDoc(
        doc(fakeAdmin, 'patients/patient-a'),
      ),
    );
  });

  // ---------------------------------------------------------
  // MISSING ADMIN FIELD
  // ---------------------------------------------------------

  it('safely denies access when admin field is missing', async () => {
    const user = testEnv
      .authenticatedContext('user-without-admin', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      deleteDoc(
        doc(user, 'patients/patient-a'),
      ),
    );
  });

  // ---------------------------------------------------------
  // ADMIN TRUE MUST BE BOOLEAN
  // ---------------------------------------------------------

  it('does not accept admin=null', async () => {
    const fakeAdmin = testEnv
      .authenticatedContext('fake-admin-null', {
        role: 'admin',
        admin: null,
      })
      .firestore();

    await assertFails(
      deleteDoc(
        doc(fakeAdmin, 'patients/patient-a'),
      ),
    );
  });

  // ---------------------------------------------------------
  // DOCTOR CANNOT WRITE CARE TEAM
  // ---------------------------------------------------------

  it('denies doctor from modifying care-team assignments', async () => {
    const doctor = testEnv
      .authenticatedContext('doctor-3', {
        role: 'doctor',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(
          doctor,
          'patients/patient-a/careTeam/doctor-3',
        ),
        {
          role: 'doctor',
        },
      ),
    );
  });

  // ---------------------------------------------------------
  // PATIENT CANNOT WRITE CARE TEAM
  // ---------------------------------------------------------

  it('denies patient from adding themselves as doctor', async () => {
    const patient = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(
          patient,
          'patients/patient-a/careTeam/patient-a',
        ),
        {
          role: 'doctor',
        },
      ),
    );
  });
});