import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { AccessDenied, Login } from './features/auth/Login';
import { Dashboard } from './routes/Dashboard';
import { Legal } from './routes/Legal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PatientSelectionProvider } from './state/dashboard';
import { DependencyProvider } from './state/dependencies';
import { doctorIdentity } from './data/fixtures';

const CLINICAL_ROUTES = ['overview', 'summary', 'trends', 'sessions', 'medication', 'alerts', 'device', 'audit'];

function Route() {
  const [hash, setHash] = useState(location.hash || '#/login');
  const { access } = useAuth();
  useEffect(() => {
    const handler = () => setHash(location.hash || '#/login');
    addEventListener('hashchange', handler);
    return () => removeEventListener('hashchange', handler);
  }, []);
  const route = hash.replace('#/', '').split('?')[0];

  if (route === 'privacy' || route === 'terms') {
    return <Legal kind={route === 'privacy' ? 'Privacy Policy' : 'Terms of Service'} />;
  }
  if (access === 'non-doctor' || access === 'disabled') return <AccessDenied kind={access} />;
  if (access === 'initializing') return <Login booting />;
  if (route === 'login') {
    if (access === 'doctor') {
      window.location.hash = '#/overview';
      return null;
    }
    return <Login />;
  }
  if (access === 'signed-out') return <Login />;
  if (CLINICAL_ROUTES.includes(route)) return <Dashboard route={route} />;
  return (
    <main className="login">
      <section>
        <h1>Route not found</h1>
        <p>The requested dashboard view does not exist.</p>
        <a className="button primary" href="#/overview">
          Go to overview
        </a>
      </section>
    </main>
  );
}

// The doctor identity shown in the shell is assembled at the composition
// root: the display name comes from the fixture/identity source behind the
// seam, and the clinic from the authenticated session.
function AuthedShell() {
  const { clinic } = useAuth();
  return (
    <DependencyProvider doctor={{ ...doctorIdentity, clinic }}>
      <PatientSelectionProvider>
        <Route />
      </PatientSelectionProvider>
    </DependencyProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthedShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
