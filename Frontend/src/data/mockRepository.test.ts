import { describe, expect, it } from 'vitest';
import { mockRepository, quarantinedFor, repositoryState } from './mockRepository';
import { AuthorizationError } from '../domain/models';

describe('mock clinical repository', () => {
  it('keeps incomplete trend points distinct from zero', async () => {
    const data = await mockRepository.trends({ patientId: 'patient-1088', days: 30 });
    const gaps = data.filter((x) => x.memory === null);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((x) => x.state === 'awaiting_sync')).toBe(true);
    expect(data.some((x) => x.memory === 0)).toBe(false);
  });

  it('scopes sessions to a selected patient', async () => {
    const page = await mockRepository.sessions({ patientId: 'patient-1042', pageSize: 10 });
    expect(page.items.every((x) => x.patientId === 'patient-1042')).toBe(true);
    expect(page.items.length).toBe(10);
  });

  it('returns a next cursor for paginated sessions', async () => {
    const page = await mockRepository.sessions({ patientId: 'patient-1042', pageSize: 3 });
    expect(page.nextCursor).toBeTruthy();
    const next = await mockRepository.sessions({
      patientId: 'patient-1042',
      pageSize: 3,
      before: page.nextCursor as string,
    });
    expect(next.items.length).toBeGreaterThan(0);
  });

  it('exposes protected audio state without URLs', async () => {
    const page = await mockRepository.sessions({ patientId: 'patient-1042', pageSize: 10 });
    expect(page.items.some((x) => x.audio === 'available')).toBe(true);
    expect(JSON.stringify(page.items)).not.toContain('http');
  });

  it('denies the revoked-assignment patient with AuthorizationError', async () => {
    await expect(mockRepository.trends({ patientId: 'patient-1170', days: 7 })).rejects.toThrow(AuthorizationError);
    await expect(
      mockRepository.sessions({ patientId: 'patient-1170', pageSize: 5 }),
    ).rejects.toThrow(AuthorizationError);
  });

  it('quarantines unsupported schema versions instead of rendering them', async () => {
    const page = await mockRepository.sessions({ patientId: 'patient-1042', pageSize: 50 });
    // The malformed schema_version 7 doc must never appear as a session.
    expect(page.items.some((s) => s.game === 'Unknown game')).toBe(false);
    const quarantined = repositoryState().quarantined;
    expect(quarantined.some((q) => q.reason === 'unsupported schema version')).toBe(true);
  });

  it('includes the legacy v1 session with explicit legacy quality', async () => {
    const page = await mockRepository.sessions({ patientId: 'patient-1042', pageSize: 50 });
    const legacy = page.items.find((s) => s.difficulty === null && s.schemaVersion === 'v1');
    expect(legacy).toBeDefined();
    expect(legacy?.dataQuality).toBe('legacy');
    expect(legacy?.difficulty).toBeNull();
  });

  it('filters audit results and search server-side', async () => {
    const denied = await mockRepository.audit({ patientId: 'patient-1042', pageSize: 50, result: 'denied' });
    expect(denied.items.every((e) => e.result === 'denied')).toBe(true);
    const search = await mockRepository.audit({ patientId: 'patient-1042', pageSize: 50, search: 'audio' });
    expect(search.items.every((e) => e.action.toLowerCase().includes('audio'))).toBe(true);
  });

  it('paginates audit history with cursors', async () => {
    const first = await mockRepository.audit({ patientId: 'patient-1042', pageSize: 5 });
    expect(first.items.length).toBe(5);
    expect(first.nextCursor).toBeTruthy();
    const second = await mockRepository.audit({ patientId: 'patient-1042', pageSize: 5, cursor: first.nextCursor as string });
    expect(second.items[0].id).not.toBe(first.items[0].id);
  });

  it('marks one medication event awaiting sync and never as missed', async () => {
    const meds = await mockRepository.medications({ patientId: 'patient-1088', pageSize: 50 });
    expect(meds.items.some((m) => m.state === 'awaiting_sync')).toBe(true);
    expect(meds.items.some((m) => m.state === 'unable')).toBe(true);
  });

  it('exposes de-duplicated alerts with duplicateOf set', async () => {
    const alerts = await mockRepository.alerts({ patientId: 'patient-1042', pageSize: 50 });
    expect(alerts.items.some((a) => a.duplicateOf !== undefined)).toBe(true);
  });

  it('records audio attempts in the audit history without URLs', async () => {
    const before = await mockRepository.audit({ patientId: 'patient-1042', pageSize: 50 });
    await mockRepository.recordAudioAttempt('patient-1042', 's-x', 'allowed');
    const after = await mockRepository.audit({ patientId: 'patient-1042', pageSize: 50 });
    expect(after.items.length).toBe(before.items.length + 1);
    const recorded = after.items.find((e) => e.action.includes('s-x'));
    expect(recorded?.action).toBe('Protected audio play attempt (s-x)');
    expect(recorded?.result).toBe('allowed');
    expect(JSON.stringify(recorded)).not.toContain('http');
  });

  it('denies audio attempt recording for the revoked patient', async () => {
    await expect(mockRepository.recordAudioAttempt('patient-1170', 's-1', 'allowed')).rejects.toThrow(AuthorizationError);
  });

  it('scopes quarantine notices per patient', async () => {
    await mockRepository.sessions({ patientId: 'patient-1042', pageSize: 5 });
    const p1042 = quarantinedFor('patient-1042');
    const p1103 = quarantinedFor('patient-1103');
    expect(p1042.length).toBeGreaterThan(0);
    expect(p1042.every((q) => q.patientUid === 'patient-1042' || !q.patientUid)).toBe(true);
    expect(p1103.every((q) => q.patientUid === 'patient-1103' || !q.patientUid)).toBe(true);
  });

  it('presents the revoked patient without clinical metrics on the roster', async () => {
    const patients = await mockRepository.patients();
    const revoked = patients.find((p) => p.id === 'patient-1170');
    expect(revoked?.assignmentRevoked).toBe(true);
    expect(revoked?.adherence7).toBeNull();
    expect(revoked?.sessions7).toBeNull();
    expect(revoked?.activeAlerts).toBe(-1);
  });

  it('keeps the roster 7-day session counter consistent with session history', async () => {
    const patients = await mockRepository.patients();
    for (const patient of patients.filter((p) => !p.assignmentRevoked && p.sessions7 !== null)) {
      // Walk the cursor-paginated history and count sessions in the last 7 days.
      let count = 0;
      let before: string | undefined = undefined;
      // The history is newest-first; 7-day window starts at 2026-09-01.
      do {
        const page = await mockRepository.sessions({
          patientId: patient.id,
          pageSize: 3,
          ...(before ? { before } : {}),
        });
        count += page.items.filter((s) => s.completedAt >= '2026-09-01').length;
        before = page.nextCursor ?? undefined;
      } while (before);
      expect(count).toBe(patient.sessions7);
    }
  });
});
