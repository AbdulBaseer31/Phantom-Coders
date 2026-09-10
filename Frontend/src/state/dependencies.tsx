// Dependency seam: views receive the repository, audio service, and doctor
// identity through this context instead of importing concrete mock modules.
// Swapping to the real Firebase implementation means mounting this provider
// with different arguments (or a sibling provider module); no view changes.
import { createContext, useContext, type ReactNode } from 'react';
import type { AudioPlaybackService, DashboardRepository } from '../domain/models';
import { mockRepository } from '../data/mockRepository';
import { FirebaseDashboardRepository } from '../adapters/firebase/repository';
import { mockAudioService } from '../audio/mockAudio';
import { doctorIdentity } from '../data/fixtures';

// Provide the appropriate repository implementation based on environment variables
export const repository: DashboardRepository = 
  import.meta.env.VITE_USE_MOCK === 'true' 
    ? mockRepository 
    : new FirebaseDashboardRepository();

export interface DoctorIdentity {
  name: string;
  clinic: string;
}

export interface Dependencies {
  repository: DashboardRepository;
  audioService: AudioPlaybackService;
  doctor: DoctorIdentity;
}

// A consumer rendered outside the provider fails loudly instead of silently
// falling back to mock data: a missing provider is a wiring bug, and mock
// fallbacks would hide it until production.
const Dependency = createContext<Dependencies | null>(null);

export function DependencyProvider({
  children,
  repository: repo = repository,
  audioService = mockAudioService,
  doctor = doctorIdentity,
}: {
  children: ReactNode;
  repository?: DashboardRepository;
  audioService?: AudioPlaybackService;
  doctor?: DoctorIdentity;
}) {
  const value = { repository: repo, audioService, doctor };
  return <Dependency.Provider value={value}>{children}</Dependency.Provider>;
}

export function useDependencies(): Dependencies {
  const deps = useContext(Dependency);
  if (!deps) {
    throw new Error('useDependencies requires the DependencyProvider to be mounted.');
  }
  return deps;
}
