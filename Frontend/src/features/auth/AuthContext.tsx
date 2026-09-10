import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../../adapters/firebase/config';

export type Access = 'signed-out' | 'initializing' | 'doctor' | 'non-doctor' | 'disabled';

export interface AuthState {
  access: Access;
  setAccess: (v: Access) => void;
  clinic: string;
  signIn: (email: string, password: string, clinic: string) => Promise<'ok' | 'invalid' | 'error'>;
  signOut: () => void;
}

const Auth = createContext<AuthState>({
  access: 'initializing',
  setAccess: () => {},
  clinic: 'North Clinic',
  signIn: async () => 'error',
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<Access>('initializing');
  const [clinic, setClinic] = useState('North Clinic');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Force refresh token to get latest claims
          const tokenResult = await user.getIdTokenResult(true);
          // Only grant access if the user has the doctor custom claim or admin claim
          if (tokenResult.claims.role === 'doctor' || tokenResult.claims.admin === true) {
            setAccess('doctor');
          } else {
            // Logged in but not a doctor (e.g. patient testing on wrong portal)
            setAccess('non-doctor');
          }
        } catch (error) {
          console.error("Failed to decode token claims", error);
          setAccess('signed-out');
        }
      } else {
        setAccess('signed-out');
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, selectedClinic: string): Promise<'ok' | 'invalid' | 'error'> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setClinic(selectedClinic);
      // setAccess will be updated by the onAuthStateChanged listener
      return 'ok';
    } catch (error: any) {
      console.error("Sign in failed:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return 'invalid';
      }
      return 'error';
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setAccess('signed-out');
      localStorage.removeItem('selectedPatient');
      window.location.hash = '#/login';
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  return <Auth.Provider value={{ access, setAccess, clinic, signIn, signOut }}>{children}</Auth.Provider>;
}

export const useAuth = () => useContext(Auth);
