import { messaging, realtimeDb } from './firebase.js';
import type { NotificationService } from './domain.js';

export class FirebaseNotificationService implements NotificationService {
  async sendFcm(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string> = {},
    patientId?: string,
  ): Promise<void> {
    if (tokens.length === 0) return;

    await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data,
    });

    const notificationRef = realtimeDb
      .ref('notifications')
      .push();

    await notificationRef.set({
      patientId: patientId ?? null,
      title,
      body,
      data,
      createdAt: Date.now(),
    });
  }

  async simulateSms(
    patientId: string,
    body: string,
  ): Promise<void> {
    console.info('[SIMULATED_SMS]', {
      patientId,
      body,
    });
  }

  async simulateEmail(
    patientId: string,
    subject: string,
    body: string,
  ): Promise<void> {
    console.info('[SIMULATED_EMAIL]', {
      patientId,
      subject,
      body,
    });
  }
}
