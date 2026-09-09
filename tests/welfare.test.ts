import { describe, expect, it, vi } from 'vitest';
import {
  processWelfareHeartbeat,
  INACTIVITY_MS,
} from '../src/welfare';
import type {
  Alert,
  AlertRepository,
  NotificationService,
  Patient,
  PatientRepository,
} from '../src/domain';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    displayName: 'Test Patient',
    role: 'patient',
    doctorIds: [],
    fcmTokens: ['test-fcm-token'],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    schemaVersion: 1,
    ...overrides,
  };
}

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    patientId: 'patient-1',
    type: 'WELFARE_INACTIVITY',
    severity: 'HIGH',
    status: 'ACTIVE',
    message:
      'No activity or sync has been recorded for more than 24 hours.',
    createdAt: new Date('2026-09-09T12:00:00Z'),
    schemaVersion: 1,
    ...overrides,
  };
}

describe('processWelfareHeartbeat', () => {
  it('creates a welfare alert for an inactive patient', async () => {
    const patient = makePatient();

    const patientRepository: PatientRepository = {
      get: vi.fn(),
      listInactive: vi.fn().mockResolvedValue([patient]),
      save: vi.fn(),
    };

    const alertRepository: AlertRepository = {
      hasActiveWelfareAlert: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(makeAlert()),
    };

    const notificationService: NotificationService = {
      sendFcm: vi.fn().mockResolvedValue(undefined),
      simulateSms: vi.fn().mockResolvedValue(undefined),
      simulateEmail: vi.fn().mockResolvedValue(undefined),
    };

    const now = new Date('2026-09-09T12:00:00Z');

    const created = await processWelfareHeartbeat(
      patientRepository,
      alertRepository,
      notificationService,
      now,
    );

    expect(created).toBe(1);

    expect(patientRepository.listInactive).toHaveBeenCalledWith(
      new Date(now.getTime() - INACTIVITY_MS),
      100,
    );

    expect(alertRepository.create).toHaveBeenCalledWith({
      patientId: 'patient-1',
      type: 'WELFARE_INACTIVITY',
      severity: 'HIGH',
      status: 'ACTIVE',
      message:
        'No activity or sync has been recorded for more than 24 hours.',
      createdAt: now,
    });

    expect(notificationService.sendFcm).toHaveBeenCalledWith(
      ['test-fcm-token'],
      'Welfare check needed',
      'No activity or sync has been recorded for more than 24 hours.',
      {
        alertId: 'alert-1',
        patientId: 'patient-1',
        type: 'WELFARE_INACTIVITY',
      },
    );

    expect(notificationService.simulateSms).toHaveBeenCalledWith(
      'patient-1',
      'No activity or sync has been recorded for more than 24 hours.',
    );

    expect(notificationService.simulateEmail).toHaveBeenCalledWith(
      'patient-1',
      'Welfare alert',
      'No activity or sync has been recorded for more than 24 hours.',
    );
  });

  it('does not create a duplicate alert when an active alert already exists', async () => {
    const patient = makePatient();

    const patientRepository: PatientRepository = {
      get: vi.fn(),
      listInactive: vi.fn().mockResolvedValue([patient]),
      save: vi.fn(),
    };

    const alertRepository: AlertRepository = {
      hasActiveWelfareAlert: vi.fn().mockResolvedValue(true),
      create: vi.fn(),
    };

    const notificationService: NotificationService = {
      sendFcm: vi.fn(),
      simulateSms: vi.fn(),
      simulateEmail: vi.fn(),
    };

    const created = await processWelfareHeartbeat(
      patientRepository,
      alertRepository,
      notificationService,
      new Date('2026-09-09T12:00:00Z'),
    );

    expect(created).toBe(0);
    expect(alertRepository.create).not.toHaveBeenCalled();
    expect(notificationService.sendFcm).not.toHaveBeenCalled();
    expect(notificationService.simulateSms).not.toHaveBeenCalled();
    expect(notificationService.simulateEmail).not.toHaveBeenCalled();
  });

  it('handles multiple inactive patients', async () => {
    const patient1 = makePatient({
      id: 'patient-1',
      displayName: 'Patient One',
      fcmTokens: ['token-1'],
    });

    const patient2 = makePatient({
      id: 'patient-2',
      displayName: 'Patient Two',
      fcmTokens: ['token-2'],
    });

    const patientRepository: PatientRepository = {
      get: vi.fn(),
      listInactive: vi.fn().mockResolvedValue([
        patient1,
        patient2,
      ]),
      save: vi.fn(),
    };

    const alertRepository: AlertRepository = {
      hasActiveWelfareAlert: vi.fn().mockResolvedValue(false),
      create: vi
        .fn()
        .mockResolvedValueOnce(
          makeAlert({ id: 'alert-1', patientId: 'patient-1' }),
        )
        .mockResolvedValueOnce(
          makeAlert({ id: 'alert-2', patientId: 'patient-2' }),
        ),
    };

    const notificationService: NotificationService = {
      sendFcm: vi.fn().mockResolvedValue(undefined),
      simulateSms: vi.fn().mockResolvedValue(undefined),
      simulateEmail: vi.fn().mockResolvedValue(undefined),
    };

    const created = await processWelfareHeartbeat(
      patientRepository,
      alertRepository,
      notificationService,
      new Date('2026-09-09T12:00:00Z'),
    );

    expect(created).toBe(2);
    expect(alertRepository.create).toHaveBeenCalledTimes(2);
    expect(notificationService.sendFcm).toHaveBeenCalledTimes(2);
    expect(notificationService.simulateSms).toHaveBeenCalledTimes(2);
    expect(notificationService.simulateEmail).toHaveBeenCalledTimes(2);
  });

  it('does not create alerts when there are no inactive patients', async () => {
    const patientRepository: PatientRepository = {
      get: vi.fn(),
      listInactive: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };

    const alertRepository: AlertRepository = {
      hasActiveWelfareAlert: vi.fn(),
      create: vi.fn(),
    };

    const notificationService: NotificationService = {
      sendFcm: vi.fn(),
      simulateSms: vi.fn(),
      simulateEmail: vi.fn(),
    };

    const created = await processWelfareHeartbeat(
      patientRepository,
      alertRepository,
      notificationService,
      new Date('2026-09-09T12:00:00Z'),
    );

    expect(created).toBe(0);
    expect(alertRepository.create).not.toHaveBeenCalled();
  });

  it('processes at most the repository batch size', async () => {
    const patientRepository: PatientRepository = {
      get: vi.fn(),
      listInactive: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };

    const alertRepository: AlertRepository = {
      hasActiveWelfareAlert: vi.fn(),
      create: vi.fn(),
    };

    const notificationService: NotificationService = {
      sendFcm: vi.fn(),
      simulateSms: vi.fn(),
      simulateEmail: vi.fn(),
    };

    await processWelfareHeartbeat(
      patientRepository,
      alertRepository,
      notificationService,
      new Date('2026-09-09T12:00:00Z'),
    );

    expect(patientRepository.listInactive).toHaveBeenCalledWith(
      expect.any(Date),
      100,
    );
  });
});