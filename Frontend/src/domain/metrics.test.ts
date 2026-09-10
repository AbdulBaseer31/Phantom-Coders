import { describe, expect, it } from 'vitest';
import { adherencePercent, domainAverage, averageLatency, audioAvailableCount, activeAlertCount } from './metrics';
import { latencyBandsForPoints, weeklyAdherence, trendWindow } from './viewModels';
import type { Alert, MedicationEvent, Session, TrendPoint } from './models';

const point = (date: string, score: number | null, latency: number | null = 1000): TrendPoint => ({
  date,
  memory: score,
  attention: score,
  language: score,
  latency,
});

describe('domain metrics', () => {
  it('computes adherence only over reported events', () => {
    const events: MedicationEvent[] = [
      { id: '1', patientId: 'p', medicine: 'A', scheduledAt: '2026-09-01T08:00:00+05:30', state: 'taken' },
      { id: '2', patientId: 'p', medicine: 'A', scheduledAt: '2026-09-02T08:00:00+05:30', state: 'missed' },
      { id: '3', patientId: 'p', medicine: 'A', scheduledAt: '2026-09-03T08:00:00+05:30', state: 'awaiting_sync' },
    ];
    expect(adherencePercent(events)).toBe(50);
  });

  it('returns null adherence when nothing is reported', () => {
    const events: MedicationEvent[] = [
      { id: '1', patientId: 'p', medicine: 'A', scheduledAt: '2026-09-01T08:00:00+05:30', state: 'awaiting_sync' },
    ];
    expect(adherencePercent(events)).toBeNull();
  });

  it('averages only reported domain scores, gaps excluded not zeroed', () => {
    const points = [point('2026-09-01', 80), point('2026-09-02', null), point('2026-09-03', 60)];
    expect(domainAverage(points, 'memory')).toBe(70);
  });

  it('returns null average when the whole window is awaiting sync', () => {
    const points = [point('2026-09-01', null), point('2026-09-02', null)];
    expect(domainAverage(points, 'memory')).toBeNull();
  });

  it('computes latency averages ignoring nulls', () => {
    const points = [point('d1', 10, 800), point('d2', 10, null), point('d3', 10, 1200)];
    expect(averageLatency(points)).toBe(1000);
  });

  it('counts active alerts only', () => {
    const alerts: Alert[] = [
      { id: '1', patientId: 'p', kind: 'Device', severity: 'low', createdAt: 't', status: 'active', message: 'm' },
      { id: '2', patientId: 'p', kind: 'Device', severity: 'low', createdAt: 't', status: 'acknowledged', message: 'm' },
    ];
    expect(activeAlertCount(alerts)).toBe(1);
  });

  it('counts available audio sessions only', () => {
    const sessions = [
      { audio: 'available' },
      { audio: 'unavailable' },
      { audio: 'denied' },
      { audio: 'available' },
    ] as Session[];
    expect(audioAvailableCount(sessions)).toBe(2);
  });
});

describe('view models', () => {
  it('bands latency including a not-reported band', () => {
    const points = [
      { latency: 700 },
      { latency: 700 },
      { latency: 1000 },
      { latency: 1500 },
      { latency: null },
    ] as TrendPoint[];
    const bands = latencyBandsForPoints(points);
    expect(bands.map((b) => b.count)).toEqual([2, 1, 1, 1]);
  });

  it('marks weeks with no reported events as null adherence', () => {
    const events: MedicationEvent[] = [
      { id: '1', patientId: 'p', medicine: 'A', scheduledAt: '2026-09-06T08:00:00+05:30', state: 'taken' },
    ];
    const weeks = weeklyAdherence(events, 4, '2026-09-07');
    expect(weeks[3].percent).toBe(100);
    expect(weeks[2].percent).toBeNull();
  });

  it('slices the trend window to the requested days', () => {
    const points = Array.from({ length: 30 }, (_, i) => point(`2026-08-${String(i + 1).padStart(2, '0')}`, 50));
    expect(trendWindow(points, 7)).toHaveLength(7);
    expect(trendWindow(points, 30)).toHaveLength(30);
  });
});
