// Derived metrics computed from repository data. Views never hardcode
// figures; every number shown is derived from the loaded fixtures so the
// same code path works with real backend data.
import type { Alert, MedicationEvent, Session, TrendPoint } from './models';

export function adherencePercent(events: MedicationEvent[]): number | null {
  const reported = events.filter((e) => e.state !== 'awaiting_sync');
  if (reported.length === 0) return null;
  const taken = reported.filter((e) => e.state === 'taken').length;
  return Math.round((taken / reported.length) * 100);
}

export function averageLatency(points: TrendPoint[]): number | null {
  const values = points.map((p) => p.latency).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function domainAverage(points: TrendPoint[], domain: keyof TrendPoint & string): number | null {
  const values = points
    .map((p) => p[domain])
    .filter((v): v is number => typeof v === 'number' && v !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function activeAlertCount(alerts: Alert[]): number {
  return alerts.filter((a) => a.status === 'active').length;
}

export function audioAvailableCount(sessions: Session[]): number {
  return sessions.filter((s) => s.audio === 'available').length;
}
