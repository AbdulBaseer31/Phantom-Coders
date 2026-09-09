import { AlertRepository, NotificationService, PatientRepository } from './domain';

export const INACTIVITY_MS = 24 * 60 * 60 * 1000;
export const HEARTBEAT_BATCH_SIZE = 100;

export async function processWelfareHeartbeat(
  patientRepository: PatientRepository,
  alertRepository: AlertRepository,
  notificationService: NotificationService,
  now = new Date(),
): Promise<number> {
  const patients = await patientRepository.listInactive(new Date(now.getTime() - INACTIVITY_MS), HEARTBEAT_BATCH_SIZE);
  let created = 0;
  for (const patient of patients) {
    if (await alertRepository.hasActiveWelfareAlert(patient.id)) continue;
    const alert = await alertRepository.create({
      patientId: patient.id,
      type: 'WELFARE_INACTIVITY',
      severity: 'HIGH',
      status: 'ACTIVE',
      message: 'No activity or sync has been recorded for more than 24 hours.',
      createdAt: now,
    });
    await notificationService.sendFcm(patient.fcmTokens, 'Welfare check needed', alert.message, {
      alertId: alert.id,
      patientId: patient.id,
      type: alert.type,
    });
    await notificationService.simulateSms(patient.id, alert.message);
    await notificationService.simulateEmail(patient.id, 'Welfare alert', alert.message);
    created += 1;
  }
  return created;
}
