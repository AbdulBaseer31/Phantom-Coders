import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { Button, Notice } from '../../components/ui';
import { MONITORING_LABEL } from '../../domain/language';

export function Login({ booting = false }: { booting?: boolean }) {
  const { signIn, setAccess, clinic } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClinic, setSelectedClinic] = useState(clinic);
  const [state, setState] = useState<'idle' | 'loading' | 'invalid' | 'error'>('idle');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'loading') return;
    if (!email.trim() || !password) {
      setState('invalid');
      return;
    }
    setState('loading');
    const result = await signIn(email, password, selectedClinic);
    if (result === 'ok') {
      window.location.hash = '#/overview';
    } else {
      setState(result);
    }
  };

  const emailValid = email === '' || /.+@.+\..+/.test(email);

  return (
    <main className="login">
      <section>
        <p className="eyebrow">SIH26003 · Clinical monitoring</p>
        <h1>Doctor dashboard</h1>
        <p>
          Review {MONITORING_LABEL.toLowerCase()} information for patients assigned to your care team. This dashboard
          does not make clinical diagnoses.
        </p>
        {booting && <Notice>Restoring your session…</Notice>}
        {state === 'invalid' && (
          <Notice kind="error">
            The sign-in details did not match a verified doctor account. Check the address and password, or contact
            your clinic administrator.
          </Notice>
        )}
        {state === 'error' && <Notice kind="error">Sign-in could not be completed right now. Try again.</Notice>}
        <form onSubmit={submit} noValidate aria-hidden={booting || undefined}>
          <label>
            Clinic account email
            <input
              type="email"
              value={email}
              autoComplete="username"
              disabled={booting}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === 'invalid') setState('idle');
              }}
              aria-invalid={!emailValid}
              required
            />
          </label>
          {!emailValid && (
            <p className="fieldError" role="alert">
              Enter a valid email address.
            </p>
          )}
          <label>
            Password
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              disabled={booting}
              onChange={(e) => {
                setPassword(e.target.value);
                if (state === 'invalid') setState('idle');
              }}
              required
            />
          </label>
          <label>
            Clinic
            <select value={selectedClinic} onChange={(e) => setSelectedClinic(e.target.value)} disabled={booting}>
              <option value="North Clinic">North Clinic</option>
              <option value="South Clinic">South Clinic</option>
            </select>
          </label>
          <Button type="submit" disabled={state === 'loading' || booting || !emailValid || password === ''}>
            {state === 'loading' ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <details className="fixtureHint">
          <summary>Fixture sign-in details</summary>
          <p>
            This mock frontend accepts mira.sen@clinic.example with password doctor-26003. Any other combination shows
            the invalid-credentials state. The preview buttons below demonstrate the access guard for accounts without
            a verified doctor claim; they are fixture-only paths.
          </p>
        </details>
        <div className="loginTools">
          <Button variant="secondary" onClick={() => setAccess('non-doctor')}>
            Preview non-doctor access
          </Button>
          <Button variant="secondary" onClick={() => setAccess('disabled')}>
            Preview disabled account
          </Button>
        </div>
        <p className="legalLinks">
          <a href="#/privacy">Privacy Policy</a>
          <a href="#/terms">Terms of Service</a>
        </p>
      </section>
    </main>
  );
}

export function AccessDenied({ kind }: { kind: 'non-doctor' | 'disabled' }) {
  const { setAccess } = useAuth();
  return (
    <main className="login">
      <section>
        <h1>{kind === 'disabled' ? 'Account unavailable' : 'Access denied'}</h1>
        <p>
          {kind === 'disabled'
            ? 'This account is disabled or its session has expired. Sign in again or contact your clinic administrator.'
            : 'A verified doctor role is required before patient monitoring information can be opened. Contact your clinic administrator if you believe this is an error.'}
        </p>
        <Button onClick={() => setAccess('signed-out')}>Return to sign in</Button>
      </section>
    </main>
  );
}
