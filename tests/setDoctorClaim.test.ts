process.env.FIREBASE_PROJECT_ID = 'dementia-test';
process.env.GCLOUD_PROJECT = 'dementia-test';
process.env.GOOGLE_CLOUD_PROJECT = 'dementia-test';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const { auth, db } = await import('../src/firebase.js');
const { setDoctorClaim } = await import('../src/index.js');

const setDoctorClaimRun = (setDoctorClaim as any).run;

const doctorUid = `doctor-test-${Date.now()}`;

beforeAll(async () => {
  await auth.createUser({
    uid: doctorUid,
    email: `${doctorUid}@example.com`,
  });
});

afterAll(async () => {
  await db.doc(`users/${doctorUid}`).delete().catch(() => {});
  await auth.deleteUser(doctorUid).catch(() => {});
});

describe('setDoctorClaim', () => {
  it('rejects unauthenticated callers', async () => {
    await expect(
      setDoctorClaimRun(
        { doctorId: doctorUid },
        { auth: undefined },
      ),
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rejects non-admin callers', async () => {
    await expect(
      setDoctorClaimRun(
        { doctorId: doctorUid },
        {
          auth: {
            uid: 'not-admin',
            token: {},
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rejects a missing doctorId', async () => {
    await expect(
      setDoctorClaimRun(
        {},
        {
          auth: {
            uid: 'admin-user',
            token: { admin: true },
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('rejects an empty doctorId', async () => {
    await expect(
      setDoctorClaimRun(
        { doctorId: '' },
        {
          auth: {
            uid: 'admin-user',
            token: { admin: true },
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('rejects a doctorId for a nonexistent user', async () => {
    await expect(
      setDoctorClaimRun(
        { doctorId: 'does-not-exist' },
        {
          auth: {
            uid: 'admin-user',
            token: { admin: true },
          },
        },
      ),
    ).rejects.toThrow();
  });

  it('sets the doctor claim for an existing user', async () => {
    const result = await setDoctorClaimRun(
      { doctorId: doctorUid },
      {
        auth: {
          uid: 'admin-user',
          token: { admin: true },
        },
      },
    );

    expect(result).toEqual({
      doctorId: doctorUid,
      role: 'doctor',
    });

    const user = await auth.getUser(doctorUid);
    expect(user.customClaims).toMatchObject({
      role: 'doctor',
    });

    const userDoc = await db.doc(`users/${doctorUid}`).get();

    expect(userDoc.exists).toBe(true);
    expect(userDoc.data()).toMatchObject({
      role: 'doctor',
    });
  });

  it('ignores unrelated extra fields', async () => {
    const result = await setDoctorClaimRun(
      {
        doctorId: doctorUid,
        admin: true,
        role: 'admin',
        targetUid: 'attacker',
        malicious: '<script>alert(1)</script>',
      },
      {
        auth: {
          uid: 'admin-user',
          token: { admin: true },
        },
      },
    );

    expect(result).toEqual({
      doctorId: doctorUid,
      role: 'doctor',
    });

    const user = await auth.getUser(doctorUid);

    expect(user.customClaims).not.toMatchObject({
      role: 'admin',
      admin: true,
    });
  });
});
