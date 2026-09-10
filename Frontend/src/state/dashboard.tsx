import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AuthorizationError, type Patient } from '../domain/models';
import { useDependencies } from './dependencies';

export interface AsyncState<T> {
  value: T | undefined;
  error: string | undefined;
  denied: boolean;
  loading: boolean;
  reload: () => void;
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [value, setValue] = useState<T>();
  const [error, setError] = useState<string>();
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(undefined);
    setDenied(false);
    // Clear the previous dataset on dependency change so a switching patient
    // never paints the prior patient's content while the new one loads.
    setValue(undefined);
    load()
      .then((v) => {
        if (live) {
          setValue(v);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!live) return;
        if (e instanceof AuthorizationError) {
          setDenied(true);
          setError(e.message);
        } else {
          setError('Unable to load monitoring information. Try again.');
        }
        setLoading(false);
      });
    return () => {
      live = false;
    };
    // deps are provided by the caller; tick triggers a reload
  }, [...deps, tick]);
  const reload = () => setTick((t) => t + 1);
  return { value, error, denied, loading, reload };
}

// Patient selection context: the selected id lives in React state (kept in
// sync with localStorage) so switching patients re-renders immediately even
// when the route does not change. Views read the patient through this
// context, never from localStorage directly.
interface PatientSelection {
  patients: Patient[] | undefined;
  selected: Patient | undefined;
  select: (id: string) => void;
  loading: boolean;
  error: string | undefined;
}

const Selection = createContext<PatientSelection>({
  patients: undefined,
  selected: undefined,
  select: () => {},
  loading: false,
  error: undefined,
});

export function PatientSelectionProvider({ children }: { children: ReactNode }) {
  const { repository } = useDependencies();
  const { value: patients, loading, error } = useAsync(() => repository.patients(), [repository]);
  const [storedId, setStoredId] = useState<string | null>(() => localStorage.getItem('selectedPatient'));
  useEffect(() => {
    const onStorage = () => setStoredId(localStorage.getItem('selectedPatient'));
    addEventListener('storage', onStorage);
    return () => removeEventListener('storage', onStorage);
  }, []);
  const selected = patients?.find((p) => p.id === storedId) ?? patients?.[0];
  // Keep the persisted id coherent with the validated fallback so the
  // dropdown and displayed content can never disagree.
  useEffect(() => {
    if (selected && selected.id !== storedId) {
      localStorage.setItem('selectedPatient', selected.id);
      setStoredId(selected.id);
    }
  }, [selected, storedId]);
  const select = (id: string) => {
    localStorage.setItem('selectedPatient', id);
    setStoredId(id);
  };
  return (
    <Selection.Provider value={{ patients, selected, select, loading, error }}>{children}</Selection.Provider>
  );
}

export const usePatientSelection = () => useContext(Selection);

// Quarantine documents for the selected patient, loaded through the
// repository seam. Empty while loading; the notice is informational.
export function useQuarantined(patientId?: string) {
  const { repository } = useDependencies();
  const { value } = useAsync(() => repository.quarantined(patientId), [repository, patientId]);
  return value ?? [];
}

