import { describe, expect, it } from 'vitest';
import { mockAudioService } from './mockAudio';
import type { Session } from '../domain/models';

const session = (audio: Session['audio']): Session =>
  ({
    id: 's-1',
    patientId: 'p-1',
    completedAt: '2026-09-01T09:00:00+05:30',
    game: 'Test',
    domain: 'memory',
    score: 70,
    latency: 1000,
    attempts: 1,
    hints: 0,
    difficulty: 'level 2',
    schemaVersion: 'v2',
    dataQuality: 'complete',
    audio,
    items: [],
  }) as Session;

describe('protected audio service', () => {
  it('resolves duration for authorized audio', async () => {
    const result = await mockAudioService.request({ session: session('available') });
    expect(result.durationSec).toBeGreaterThan(0);
  });

  it('fails with authorization semantics, not a generic network error', async () => {
    try {
      await mockAudioService.request({ session: session('denied') });
      expect.unreachable('denied audio must not resolve');
    } catch (e) {
      expect((e as Error).name).toBe('AuthorizationFailure');
    }
  });

  it('fails with unavailable semantics for missing audio', async () => {
    try {
      await mockAudioService.request({ session: session('unavailable') });
      expect.unreachable('unavailable audio must not resolve');
    } catch (e) {
      expect((e as Error).name).toBe('AudioUnavailable');
    }
  });
});
