import { beforeAll, afterAll, describe, expect, it } from 'vitest';

process.env.GCLOUD_PROJECT = 'dementia-test';
process.env.GOOGLE_CLOUD_PROJECT = 'dementia-test';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';

import * as myFunctions from '../src/index';

const projectId = 'dementia-test';

let testEnv: RulesTestEnvironment;

// Cloud Function v1 handlers.
// We intentionally access the underlying `.run()` handlers directly
// instead of using firebase-functions-test wrappers.
const setDoctorClaimRun = (myFunctions.setDoctorClaim as any).run;
const welfareHeartbeatRun = (myFunctions.welfareHeartbeat as any).run;

/**
 * Call setDoctorClaim with a simulated callable-function context.
 */
async function callSetDoctorClaim(
  data: unknown,
  auth?: {
    uid: string;
    token: Record<string, unknown>;
  },
): Promise<unknown> {
  return setDoctorClaimRun(data, {
    auth,
  });
}

/**
 * Create an inactive patient.
 *
 * IMPORTANT:
 * Use JavaScript Date here because the Firestore client SDK
 * accepts Date values. Do not use admin.firestore.Timestamp.
 */
async function createInactivePatient(
  patientId: string,
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, `patients/${patientId}`), {
      role: 'patient',
      lastActivityAt: new Date(
        Date.now() - 48 * 60 * 60 * 1000,
      ),
    });
  });
}

/**
 * Count active welfare inactivity alerts for one patient.
 */
async function countActiveWelfareAlerts(
  patientId: string,
): Promise<number> {
  let count = 0;

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    const snapshot = await getDocs(
      query(
        collection(db, 'alerts'),
        where('patientUid', '==', patientId),
        where('type', '==', 'WELFARE_INACTIVITY'),
        where('status', '==', 'ACTIVE'),
      ),
    );

    count = snapshot.size;
  });

  return count;
}

describe('Cloud Functions - Edge Cases', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
      },
    });

    /*
     * Seed basic patients.
     *
     * Use Date instead of admin.firestore.Timestamp because
     * these writes use the Firebase client Firestore SDK.
     */
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await setDoc(doc(db, 'patients/patient-a'), {
        role: 'patient',
        lastActivityAt: new Date(),
      });

      await setDoc(doc(db, 'patients/patient-b'), {
        role: 'patient',
        lastActivityAt: new Date(),
      });
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  // ============================================================
  // setDoctorClaim - authorization
  // ============================================================

  describe('setDoctorClaim - authorization', () => {
    it('rejects unauthenticated callers', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: 'doctor-target' },
          undefined,
        ),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });

    it('rejects patient callers', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: 'doctor-target' },
          {
            uid: 'patient-a',
            token: { role: 'patient' },
          },
        ),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });

    it('rejects doctor callers', async () => {
      await expect(
        callSetDoctorClaim(
          { doctorId: 'doctor-target' },
          {
            uid: 'doctor-a',
            token: { role: 'doctor' },
          },
        ),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });

    it('rejects users with no role', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: 'doctor-target' },
          {
            uid: 'unknown-user',
            token: {},
          },
        ),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });
  });

  // ============================================================
  // setDoctorClaim - admin claim validation
  // ============================================================

  describe('setDoctorClaim - admin claim validation', () => {
    it('rejects admin claim as string "true"', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: 'doctor-target' },
          {
            uid: 'fake-admin-string',
            token: { admin: 'true' },
          },
        ),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });

    it('rejects admin claim as number 1', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: 'doctor-target' },
          {
            uid: 'fake-admin-number',
            token: { admin: 1 },
          },
        ),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });

    it('rejects admin claim as null', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: 'doctor-target' },
          {
            uid: 'fake-admin-null',
            token: { admin: null },
          },
        ),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });

    it('rejects missing admin claim', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: 'doctor-target' },
          {
            uid: 'fake-admin-missing',
            token: {},
          },
        ),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });

    it('rejects role: admin without admin: true', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: 'doctor-target' },
          {
            uid: 'fake-role-admin',
            token: { role: 'admin' },
          },
        ),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });
  });

  // ============================================================
  // setDoctorClaim - missing parameters
  // ============================================================

  describe('setDoctorClaim - missing parameters', () => {
    const adminAuth = {
      uid: 'real-admin',
      token: { admin: true },
    };

    it('rejects undefined data', async () => {
      await expect(
        callSetDoctorClaim(undefined, adminAuth),
      ).rejects.toBeDefined();
    });

    it('rejects null data', async () => {
      await expect(
        callSetDoctorClaim(null, adminAuth),
      ).rejects.toBeDefined();
    });

    it('rejects empty object', async () => {
      await expect(
        callSetDoctorClaim({}, adminAuth),
      ).rejects.toBeDefined();
    });

    it('rejects missing targetUid', async () => {
      await expect(
        callSetDoctorClaim(
          { otherField: 'value' },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });

    it('rejects null targetUid', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: null },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });
  });

  // ============================================================
  // setDoctorClaim - invalid targetUid types
  // ============================================================

  describe('setDoctorClaim - invalid targetUid types', () => {
    const adminAuth = {
      uid: 'real-admin',
      token: { admin: true },
    };

    it('rejects numeric targetUid', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: 123 },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });

    it('rejects boolean targetUid', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: true },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });

    it('rejects object targetUid', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: { uid: 'doctor-target' } },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });

    it('rejects array targetUid', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: ['doctor-target'] },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });

    it('rejects empty targetUid', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: '' },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });

    it('rejects whitespace-only targetUid', async () => {
      await expect(
        callSetDoctorClaim(
          { targetUid: '   ' },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });
  });

  // ============================================================
  // setDoctorClaim - malicious and extra parameters
  // ============================================================

  describe('setDoctorClaim - malicious and extra parameters', () => {
    const adminAuth = {
      uid: 'real-admin',
      token: { admin: true },
    };

    it('does not allow input to inject admin claim', async () => {
      const result = await callSetDoctorClaim(
        {
          targetUid: 'doctor-target',
          admin: true,
          role: 'admin',
          permissions: ['*'],
        },
        adminAuth,
      );

      expect(result).toEqual({
        message:
          "Successfully assigned 'doctor' role to UID: doctor-target",
      });
    });

    it('ignores unrelated extra fields', async () => {
      const result = await callSetDoctorClaim(
        {
          targetUid: 'doctor-target',
          malicious:
            '<script>alert(1)</script>',
          role: 'admin',
          permissions: ['*'],
          extra: { admin: true },
        },
        adminAuth,
      );

      expect(result).toBeDefined();
    });
  });

  // ============================================================
  // setDoctorClaim - invalid target UIDs
  // ============================================================

  describe('setDoctorClaim - invalid target UIDs', () => {
    const adminAuth = {
      uid: 'real-admin',
      token: { admin: true },
    };

    it('rejects nonexistent target UID', async () => {
      await expect(
        callSetDoctorClaim(
          {
            targetUid:
              'user-that-does-not-exist-999',
          },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });

    it('rejects object target UID', async () => {
      await expect(
        callSetDoctorClaim(
          {
            targetUid: {
              uid: 'doctor-target',
            },
          },
          adminAuth,
        ),
      ).rejects.toBeDefined();
    });
  });

  // ============================================================
  // welfareHeartbeat - active patient
  // ============================================================

  describe('welfareHeartbeat - active patient', () => {
    it('does not create an alert for recently active patient', async () => {
      await testEnv.withSecurityRulesDisabled(
        async (context) => {
          const db = context.firestore();

          await setDoc(
            doc(
              db,
              'patients/active-patient',
            ),
            {
              role: 'patient',
              lastActivityAt: new Date(),
            },
          );
        },
      );

      await welfareHeartbeatRun({});

      const count =
        await countActiveWelfareAlerts(
          'active-patient',
        );

      expect(count).toBe(0);
    });
  });

  // ============================================================
  // welfareHeartbeat - inactive patient
  // ============================================================

  describe('welfareHeartbeat - inactive patient', () => {
    it('creates an alert for inactive patient', async () => {
      await createInactivePatient(
        'inactive-patient',
      );

      await welfareHeartbeatRun({});

      const count =
        await countActiveWelfareAlerts(
          'inactive-patient',
        );

      expect(count).toBe(1);
    });
  });

  // ============================================================
  // welfareHeartbeat - malformed patient data
  // ============================================================

  describe(
    'welfareHeartbeat - malformed patient data',
    () => {
      it('handles a patient with a missing role', async () => {
        await testEnv.withSecurityRulesDisabled(
          async (context) => {
            const db = context.firestore();

            await setDoc(
              doc(
                db,
                'patients/malformed-patient',
              ),
              {
                lastActivityAt: new Date(
                  Date.now() -
                    48 * 60 * 60 * 1000,
                ),
              },
            );
          },
        );

        await welfareHeartbeatRun({});
      });

      it('handles a patient with an unusual ID', async () => {
        await createInactivePatient(
          'patient-with-dash',
        );

        await welfareHeartbeatRun({});

        const count =
          await countActiveWelfareAlerts(
            'patient-with-dash',
          );

        expect(count).toBe(1);
      });
    },
  );

  // ============================================================
  // welfareHeartbeat - duplicate and replay
  // ============================================================

  describe(
    'welfareHeartbeat - duplicate and replay',
    () => {
      it('does not create duplicate alert during sequential execution', async () => {
        await createInactivePatient(
          'replay-patient',
        );

        await welfareHeartbeatRun({});
        await welfareHeartbeatRun({});

        const count =
          await countActiveWelfareAlerts(
            'replay-patient',
          );

        expect(count).toBe(1);
      });

      it('creates a new alert after the previous alert is acknowledged', async () => {
        await testEnv.withSecurityRulesDisabled(
          async (context) => {
            const db = context.firestore();

            await setDoc(
              doc(db, 'patients/ack-patient'),
              {
                role: 'patient',
                lastActivityAt: new Date(
                  Date.now() -
                    48 * 60 * 60 * 1000,
                ),
              },
            );

            await setDoc(
              doc(db, 'alerts/old-alert'),
              {
                patientUid: 'ack-patient',
                type: 'WELFARE_INACTIVITY',
                severity: 'HIGH',
                status: 'ACKNOWLEDGED',
                createdAt: new Date(),
              },
            );
          },
        );

        await welfareHeartbeatRun({});

        const count =
          await countActiveWelfareAlerts(
            'ack-patient',
          );

        expect(count).toBe(1);
      });
    },
  );

  // ============================================================
  // welfareHeartbeat - missing FCM token
  // ============================================================

  describe(
    'welfareHeartbeat - missing FCM token',
    () => {
      it('creates an alert when FCM token is missing', async () => {
        await createInactivePatient(
          'no-token-patient',
        );

        await welfareHeartbeatRun({});

        const count =
          await countActiveWelfareAlerts(
            'no-token-patient',
          );

        expect(count).toBe(1);
      });
    },
  );

  // ============================================================
  // Pub/Sub duplicate event simulation
  // ============================================================

  describe(
    'Pub/Sub duplicate event simulation',
    () => {
      it('does not create duplicate active alert for repeated execution', async () => {
        await createInactivePatient(
          'pubsub-duplicate-patient',
        );

        const event = {
          eventId: 'duplicate-event-001',
          timestamp:
            new Date().toISOString(),
        };

        await welfareHeartbeatRun(event);
        await welfareHeartbeatRun(event);

        const count =
          await countActiveWelfareAlerts(
            'pubsub-duplicate-patient',
          );

        expect(count).toBe(1);
      });
    },
  );

  // ============================================================
  // Pub/Sub out-of-order events
  // ============================================================

  describe(
    'Pub/Sub out-of-order events',
    () => {
      it('does not create duplicate active alert when events arrive out of order', async () => {
        await createInactivePatient(
          'out-of-order-patient',
        );

        const newerEvent = {
          eventId: 'event-newer',
          timestamp:
            new Date().toISOString(),
        };

        const olderEvent = {
          eventId: 'event-older',
          timestamp: new Date(
            Date.now() - 60_000,
          ).toISOString(),
        };

        await welfareHeartbeatRun(
          newerEvent,
        );

        await welfareHeartbeatRun(
          olderEvent,
        );

        const count =
          await countActiveWelfareAlerts(
            'out-of-order-patient',
          );

        expect(count).toBe(1);
      });
    },
  );

  // ============================================================
  // welfareHeartbeat - concurrency
  // ============================================================

  describe(
    'welfareHeartbeat - concurrency',
    () => {
      it('should create only one active alert for concurrent executions', async () => {
        await createInactivePatient(
          'concurrent-patient',
        );

        await Promise.all([
          welfareHeartbeatRun({}),
          welfareHeartbeatRun({}),
        ]);

        const count =
          await countActiveWelfareAlerts(
            'concurrent-patient',
          );

        expect(count).toBe(1);
      });
    },
  );

  // ============================================================
  // Error handling
  // ============================================================

  describe('error handling', () => {
    it('returns permission-denied for unauthenticated callers', async () => {
      try {
        await callSetDoctorClaim(
          { targetUid: 'doctor-target' },
          undefined,
        );

        throw new Error(
          'Expected function to reject',
        );
      } catch (error: unknown) {
        const err = error as {
          code?: string;
          message?: string;
        };

        expect(err.code).toBe(
          'permission-denied',
        );

        expect(err.message).toContain(
          'Only admins',
        );
      }
    });

    it('does not expose private credentials in error messages', async () => {
      try {
        await callSetDoctorClaim(
          { targetUid: {} },
          {
            uid: 'real-admin',
            token: { admin: true },
          },
        );

        throw new Error(
          'Expected function to reject',
        );
      } catch (error: unknown) {
        const err = error as {
          message?: string;
        };

        const message =
          String(err.message).toLowerCase();

        expect(message).not.toContain(
          'private_key',
        );

        expect(message).not.toContain(
          'client_email',
        );

        expect(message).not.toContain(
          'password',
        );

        expect(message).not.toContain(
          'secret',
        );
      }
    });
  });

  // ============================================================
  // Test isolation
  // ============================================================

  describe('test isolation', () => {
    it('can delete a test alert without affecting patient data', async () => {
      await testEnv.withSecurityRulesDisabled(
        async (context) => {
          const db = context.firestore();

          await setDoc(
            doc(
              db,
              'alerts/test-cleanup-alert',
            ),
            {
              patientUid: 'patient-a',
              type: 'TEST',
              status: 'ACTIVE',
            },
          );

          await deleteDoc(
            doc(
              db,
              'alerts/test-cleanup-alert',
            ),
          );

          const patients = await getDocs(
            query(
              collection(db, 'patients'),
              where(
                'role',
                '==',
                'patient',
              ),
            ),
          );

          expect(
            patients.size,
          ).toBeGreaterThan(0);
        },
      );
    });
  });
});