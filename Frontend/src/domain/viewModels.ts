// View-model transforms for charts: latency distribution and weekly
// adherence bars derived from repository data, never hardcoded.
// CLOCK_ANCHOR is the domain-level "today" port: the fixture data layer and
// the views both consume it from here, so a future real backend can supply
// the actual clinic date at this one location.
import type { MedicationEvent, Session, TrendPoint } from './models';

export const CLOCK_ANCHOR: string = '2026-09-07';

// Inclusive ISO start of a rolling N-day window ending at the anchor day.
// A 7-day window covers anchor-6 through anchor (7 calendar days), matching
// the weeklyAdherence convention.
export function windowStartISO(days: number): string {
  const [y, m, d] = CLOCK_ANCHOR.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - (days - 1) * 86400000).toISOString().slice(0, 10);
}

export interface LatencyBand {
  label: string;
  count: number;
}

export function latencyBandsForPoints(points: TrendPoint[]): LatencyBand[] {
  const bands: LatencyBand[] = [
    { label: 'Under 900 ms', count: 0 },
    { label: '900 to 1199 ms', count: 0 },
    { label: '1200 ms and above', count: 0 },
    { label: 'Not reported', count: 0 },
  ];
  for (const p of points) {
    if (p.latency === null) bands[3].count += 1;
    else if (p.latency < 900) bands[0].count += 1;
    else if (p.latency < 1200) bands[1].count += 1;
    else bands[2].count += 1;
  }
  return bands;
}

export interface WeeklyAdherence {
  weekLabel: string;
  percent: number | null;
}

export function weeklyAdherence(events: MedicationEvent[], weeks: number, anchorDay: string): WeeklyAdherence[] {
  const out: WeeklyAdherence[] = [];
  const [y, m, d] = anchorDay.split('-').map(Number);
  const anchorUtc = Date.UTC(y, m - 1, d) + 86400000 - 1; // end of the anchor day
  for (let w = weeks - 1; w >= 0; w--) {
    const end = anchorUtc - w * 7 * 86400000;
    const start = end - 6 * 86400000;
    const inWeek = events.filter((e) => {
      const t = new Date(e.scheduledAt).getTime();
      return t >= start && t <= end;
    });
    const reported = inWeek.filter((e) => e.state !== 'awaiting_sync');
    const taken = reported.filter((e) => e.state === 'taken').length;
    out.push({
      weekLabel: w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w} weeks ago`,
      percent: reported.length === 0 ? null : Math.round((taken / reported.length) * 100),
    });
  }
  return out;
}

export function difficultyContext(sessions: Session[]): { level: string | null; count: number }[] {
  const map = new Map<string | null, number>();
  for (const s of sessions) {
    const key = s.difficulty;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  // Sort by count descending so the summary reads deterministically.
  return [...map.entries()]
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count);
}

export function trendWindow(points: TrendPoint[], days: 7 | 30): TrendPoint[] {
  if (days === 30) return points;
  return points.slice(-days);
}
