import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { FieldValue } from 'firebase-admin/firestore';
import { auth, db } from './firebase';
import { FirestoreAlertRepository, FirestorePatientRepository } from './repositories';
import { FirebaseNotificationService } from './notifications';
import { processWelfareHeartbeat } from './welfare';

setGlobalOptions({ region: 'us-central1', maxInstances: 2, timeoutSeconds: 120 });
const patientRepository = new FirestorePatientRepository();
const alertRepository = new FirestoreAlertRepository();
const notificationService = new FirebaseNotificationService();

export const setDoctorClaim = onCall(async (request) => {
  if (!request.auth?.token.admin) throw new HttpsError('permission-denied', 'Admin access is required.');
  const doctorId = request.data?.doctorId;
  if (typeof doctorId !== 'string' || !doctorId) throw new HttpsError('invalid-argument', 'doctorId is required.');
  const user = await auth.getUser(doctorId);
  await auth.setCustomUserClaims(doctorId, { ...user.customClaims, role: 'doctor' });
  await db.doc(`users/${doctorId}`).set({ role: 'doctor', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { doctorId, role: 'doctor' };
});

export const welfareHeartbeat = onSchedule({ schedule: 'every 60 minutes', timeZone: 'UTC' }, async () => {
  await processWelfareHeartbeat(patientRepository, alertRepository, notificationService);
});
