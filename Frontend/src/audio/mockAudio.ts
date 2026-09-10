// Protected-audio frontend abstraction. The real implementation will use
// Firebase getDownloadURL + WASM AMR-WB decode behind this same interface;
// the UI state machine (authorization, unavailable, error, play, pause,
// elapsed time) is exercised fully by this mock so no view changes later.
import type {
  AudioPlaybackRequest,
  AudioPlaybackResult,
  AudioPlaybackService,
} from '../domain/models';

const later = <T>(value: T, ms = 300): Promise<T> =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export class AuthorizationFailure extends Error {
  constructor() {
    super('authorization');
    this.name = 'AuthorizationFailure';
  }
}

export class AudioUnavailable extends Error {
  constructor() {
    super('unavailable');
    this.name = 'AudioUnavailable';
  }
}

export class MockProtectedAudioService implements AudioPlaybackService {
  async request(request: AudioPlaybackRequest): Promise<AudioPlaybackResult> {
    await later(null);
    const { session } = request;
    if (session.audio === 'denied') throw new AuthorizationFailure();
    if (session.audio === 'unavailable') throw new AudioUnavailable();
    return { durationSec: 42 };
  }
}

export const mockAudioService = new MockProtectedAudioService();
