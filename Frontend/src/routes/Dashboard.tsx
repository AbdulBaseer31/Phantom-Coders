import { useState } from 'react';
import { Empty, Skeleton } from '../components/ui';
import { Button } from '../components/ui';
import { useAuth } from '../features/auth/AuthContext';
import { usePatientSelection } from '../state/dashboard';
import { useDependencies } from '../state/dependencies';
import { Overview } from '../features/overview/Overview';
import { Summary } from '../features/patients/Summary';
import { Trends } from '../features/trends/Trends';
import { Sessions } from '../features/sessions/Sessions';
import { Medication } from '../features/medication/Medication';
import { Alerts } from '../features/alerts/Alerts';
import { Device } from '../features/device/Device';
import { Audit } from '../features/audit/Audit';

const links: [string, string][] = [
  ['overview', 'Overview'],
  ['summary', 'Patient summary'],
  ['trends', 'Cognitive trends'],
  ['sessions', 'Session detail'],
  ['medication', 'Medication'],
  ['alerts', 'Alerts'],
  ['device', 'Device health'],
  ['audit', 'Audit'],
];

export function Dashboard({ route }: { route: string }) {
  const { patients, selected, select, loading, error } = usePatientSelection();
  const { doctor } = useDependencies();
  const { signOut } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  if (loading)
    return (
      <main className="routeLoading">
        <Skeleton rows={7} />
      </main>
    );
  if (error)
    return (
      <main className="routeLoading">
        <Empty title="The patient roster could not be loaded">
          The roster query failed. No patient information is shown. Use the browser refresh action to try again, or
          contact your clinic administrator if the problem continues.
        </Empty>
      </main>
    );
  if (!patients)
    return (
      <main className="routeLoading">
        <Skeleton rows={7} />
      </main>
    );
  if (patients.length === 0)
    return (
      <main className="routeLoading">
        <Empty title="No patients are assigned to you">
          Your care-team assignments do not currently include any patients. Contact your clinic administrator if you
          expected assigned patients here.
        </Empty>
      </main>
    );
  if (!selected)
    return (
      <main className="routeLoading">
        <Skeleton rows={7} />
      </main>
    );

  return (
    <div className="appShell">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header>
        <button
          className="menu"
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          aria-controls="clinical-nav"
          onClick={() => setNavOpen(!navOpen)}
        >
          Menu
        </button>
        <a className="brand" href="#/overview">
          SIH26003 <small>Clinical monitoring</small>
        </a>
        <div className="identity">
          <span>
            {doctor.name} · {doctor.clinic}
          </span>
          <Button variant="quiet" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>
      <aside id="clinical-nav" className={navOpen ? 'open' : ''}>
        <nav aria-label="Clinical dashboard">
          {links.map(([id, label]) => (
            <a key={id} className={route === id ? 'active' : ''} href={`#/${id}`} onClick={() => setNavOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
        <footer>
          <a href="#/privacy">Privacy</a>
          <a href="#/terms">Terms</a>
        </footer>
      </aside>
      <main id="content">
        <div className="context">
          <label>
            Selected patient
            <select value={selected.id} onChange={(e) => select(e.target.value)}>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.id}
                </option>
              ))}
            </select>
          </label>
          <span>Clinic timezone: Asia/Kolkata</span>
        </div>
        {/* key remounts views on patient change so no stale content, filters,
            pages, or open dialogs survive a patient switch. */}
        {route === 'overview' ? (
          <Overview patients={patients} />
        ) : route === 'summary' ? (
          <Summary key={selected.id} patientId={selected.id} />
        ) : route === 'trends' ? (
          <Trends key={selected.id} patientId={selected.id} />
        ) : route === 'sessions' ? (
          <Sessions key={selected.id} patientId={selected.id} />
        ) : route === 'medication' ? (
          <Medication key={selected.id} patientId={selected.id} />
        ) : route === 'alerts' ? (
          <Alerts key={selected.id} patientId={selected.id} />
        ) : route === 'device' ? (
          <Device key={selected.id} patientId={selected.id} />
        ) : (
          <Audit key={selected.id} patientId={selected.id} />
        )}
      </main>
    </div>
  );
}
