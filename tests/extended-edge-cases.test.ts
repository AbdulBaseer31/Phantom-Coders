import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import fs from 'node:fs';

const projectId = 'dementia-local';

describe('Firestore extended edge cases', () => {
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

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await setDoc(doc(db, 'patients/patient-a'), {
        role: 'patient',
        displayName: 'Patient A',
        owner: 'patient-a',
      });

      await setDoc(doc(db, 'patients/patient-b'), {
        role: 'patient',
        displayName: 'Patient B',
        owner: 'patient-b',
      });

      await setDoc(
        doc(db, 'patients/patient-a/gameSessions/session-1'),
        {
          patientId: 'patient-a',
          schemaVersion: 1,
          score: 10,
        },
      );
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  // ==========================================================
  // 1. UNAUTHENTICATED READ
  // ==========================================================

  it('denies unauthenticated patient read', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(
      getDoc(doc(db, 'patients/patient-a')),
    );
  });

  // ==========================================================
  // 2. UNAUTHENTICATED WRITE
  // ==========================================================

  it('denies unauthenticated patient creation', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(
      setDoc(
        doc(db, 'patients/anonymous'),
        {
          role: 'patient',
        },
      ),
    );
  });

  // ==========================================================
  // 3. PATIENT A READS PATIENT B
  // ==========================================================

  it('denies patient A from reading patient B', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      getDoc(doc(db, 'patients/patient-b')),
    );
  });

  // ==========================================================
  // 4. DOCTOR READS UNASSIGNED PATIENT
  // ==========================================================

  it('denies unassigned doctor access', async () => {
    const db = testEnv
      .authenticatedContext('doctor-unassigned', {
        role: 'doctor',
      })
      .firestore();

    await assertFails(
      getDoc(doc(db, 'patients/patient-a')),
    );
  });

  // ==========================================================
  // 5. ASSIGNED DOCTOR READS PATIENT
  // ==========================================================

  it('allows assigned doctor access', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          'patients/patient-a/careTeam/doctor-assigned',
        ),
        {
          role: 'doctor',
        },
      );
    });

    const db = testEnv
      .authenticatedContext('doctor-assigned', {
        role: 'doctor',
      })
      .firestore();

    await assertSucceeds(
      getDoc(doc(db, 'patients/patient-a')),
    );
  });

  // ==========================================================
  // 6. REMOVE ASSIGNMENT THEN RETRY
  // ==========================================================

  it('denies doctor access after assignment is removed', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(
      doc(
        db,
        'patients/patient-a/careTeam/doctor-temporary',
      ),
      {
        role: 'doctor',
      },
    );
  });

  const doctor = testEnv
    .authenticatedContext('doctor-temporary', {
      role: 'doctor',
    })
    .firestore();

  await assertSucceeds(
    getDoc(doc(doctor, 'patients/patient-a')),
  );

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const { deleteDoc } = await import('firebase/firestore');

    await deleteDoc(
      doc(
        context.firestore(),
        'patients/patient-a/careTeam/doctor-temporary',
      ),
    );
  });

  await assertFails(
    getDoc(doc(doctor, 'patients/patient-a')),
  );
});

  // ==========================================================
  // 7. WRONG UID IN BODY
  // ==========================================================

  it('denies patient A creating a record claiming patient B ownership', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          'patients/patient-a/gameSessions/wrong-owner',
        ),
        {
          patientId: 'patient-b',
          schemaVersion: 1,
        },
      ),
    );
  });

  // ==========================================================
  // 8. UID CASE MANIPULATION
  // ==========================================================

  it('does not treat different UID casing as the same identity', async () => {
    const db = testEnv
      .authenticatedContext('PATIENT-A', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      getDoc(doc(db, 'patients/patient-a')),
    );
  });

  // ==========================================================
  // 9. MISSING ROLE
  // ==========================================================

  it('denies patient creation when role is missing', async () => {
    const db = testEnv
      .authenticatedContext('new-patient', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(db, 'patients/new-patient'),
        {
          displayName: 'No Role',
        },
      ),
    );
  });

  // ==========================================================
  // 10. ROLE WRONG TYPE
  // ==========================================================

  it('denies patient creation when role is not a string', async () => {
    const db = testEnv
      .authenticatedContext('wrong-role-type', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(db, 'patients/wrong-role-type'),
        {
          role: 123,
        },
      ),
    );
  });

  // ==========================================================
  // 11. NULL ROLE
  // ==========================================================

  it('denies patient creation with null role', async () => {
    const db = testEnv
      .authenticatedContext('null-role', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(db, 'patients/null-role'),
        {
          role: null,
        },
      ),
    );
  });

  // ==========================================================
  // 12. EMPTY ROLE
  // ==========================================================

  it('denies patient creation with empty role', async () => {
    const db = testEnv
      .authenticatedContext('empty-role', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(db, 'patients/empty-role'),
        {
          role: '',
        },
      ),
    );
  });

  // ==========================================================
  // 13. UNEXPECTED ADMIN FIELD
  // ==========================================================

  it('does not allow an isAdmin document field to bypass rules', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(db, 'patients/patient-b'),
        {
          role: 'patient',
          isAdmin: true,
        },
      ),
    );
  });

  // ==========================================================
  // 14. UNEXPECTED OWNER FIELD
  // ==========================================================

  it('does not allow an owner field to bypass patient identity', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(db, 'patients/patient-b'),
        {
          role: 'patient',
          owner: 'patient-a',
        },
      ),
    );
  });

  // ==========================================================
  // 15. SESSION WRONG PATIENT ID
  // ==========================================================

  it('rejects session whose patientId does not match path', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          'patients/patient-a/gameSessions/path-mismatch',
        ),
        {
          patientId: 'patient-b',
          schemaVersion: 1,
        },
      ),
    );
  });

  // ==========================================================
  // 16. SESSION WRONG SCHEMA TYPE
  // ==========================================================

  it('rejects session schemaVersion as an object', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          'patients/patient-a/gameSessions/object-version',
        ),
        {
          patientId: 'patient-a',
          schemaVersion: {
            value: 1,
          },
        },
      ),
    );
  });

  // ==========================================================
  // 17. SESSION NULL VERSION
  // ==========================================================

  it('rejects null schemaVersion', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          'patients/patient-a/gameSessions/null-version',
        ),
        {
          patientId: 'patient-a',
          schemaVersion: null,
        },
      ),
    );
  });

  // ==========================================================
  // 18. PATIENT CANNOT DELETE ANOTHER PATIENT
  // ==========================================================

  it('denies cross-patient deletion', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    const { deleteDoc } = await import('firebase/firestore');

    await assertFails(
      deleteDoc(
        doc(db, 'patients/patient-b'),
      ),
    );
  });

  // ==========================================================
  // 19. OWNERSHIP CHANGE
  // ==========================================================

  it('denies changing session ownership', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          'patients/patient-a/gameSessions/session-1',
        ),
        {
          patientId: 'patient-b',
        },
      ),
    );
  });

  // ==========================================================
  // 20. DUPLICATE SESSION CREATION
  // ==========================================================

  it('rejects duplicate session creation when document already exists', async () => {
    const db = testEnv
      .authenticatedContext('patient-a', {
        role: 'patient',
      })
      .firestore();

    // This is setDoc, so the rules actually allow replacement because
    // create is evaluated only when the document does not already exist.
    // update is separately denied for patients.
    await assertFails(
      setDoc(
        doc(
          db,
          'patients/patient-a/gameSessions/session-1',
        ),
        {
          patientId: 'patient-a',
          schemaVersion: 1,
          score: 50,
        },
      ),
    );
  });
});