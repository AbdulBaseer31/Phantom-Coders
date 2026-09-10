import { useMemo, useState } from 'react';
import type { Patient } from '../../domain/models';
import { Button, Empty, Panel, Status, fmt } from '../../components/ui';
import { NOT_REPORTED } from '../../domain/language';
import { usePatientSelection, useQuarantined } from '../../state/dashboard';
import { alertCountText, Page, QuarantineNotice } from '../shared';

export function Overview({ patients }: { patients: Patient[] }) {
  const { select } = usePatientSelection();
  const quarantinedDocs = useQuarantined();
  const [search, setSearch] = useState('');
  const [sync, setSync] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [sort, setSort] = useState<'name' | 'alerts' | 'sync'>('name');
  const shown = useMemo(
    () =>
      patients
        .filter(
          (p) =>
            (p.name + p.id).toLowerCase().includes(search.toLowerCase()) &&
            (sync === 'all' || p.syncState === sync) &&
            (alertFilter === 'all' ||
              (alertFilter === 'has' ? p.activeAlerts > 0 : p.activeAlerts === 0)),
        )
        .sort((a, b) =>
          sort === 'name'
            ? a.name.localeCompare(b.name)
            : sort === 'alerts'
              ? b.activeAlerts - a.activeAlerts
              : a.syncState.localeCompare(b.syncState),
        ),
    [patients, search, sync, alertFilter, sort],
  );
  return (
    <>
      <Page
        title="Overview"
        sub="Use this roster to identify a patient record. Activity and sync signals are monitoring context, not clinical conclusions."
      />
      <Panel title="Find a patient">
        <div className="filters">
          <label>
            Search
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or patient ID" />
          </label>
          <label>
            Sync state
            <select value={sync} onChange={(e) => setSync(e.target.value)}>
              <option value="all">All states</option>
              <option value="current">Current</option>
              <option value="awaiting_sync">Awaiting sync</option>
              <option value="offline">Offline</option>
            </select>
          </label>
          <label>
            Alerts
            <select value={alertFilter} onChange={(e) => setAlertFilter(e.target.value)}>
              <option value="all">All patients</option>
              <option value="has">With active alerts</option>
              <option value="none">Without alerts</option>
            </select>
          </label>
          <label>
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="name">Name</option>
              <option value="alerts">Active alerts</option>
              <option value="sync">Sync state</option>
            </select>
          </label>
        </div>
      </Panel>
      {shown.length === 0 ? (
        <Empty title="No patients match these filters">Try clearing the search or selecting all sync states.</Empty>
      ) : (
        <Panel title={`${shown.length} patient records`}>
          <div className="tableWrap" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Active alerts</th>
                  <th>Adherence, 7 days</th>
                  <th>Last activity</th>
                  <th>Last cloud sync</th>
                  <th>State</th>
                  <th>
                    <span className="srOnly">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small>
                        {p.id} · {p.clinic}
                        {p.assignmentRevoked ? ' · Assignment revoked' : ''}
                      </small>
                    </td>
                    <td>{p.assignmentRevoked ? NOT_REPORTED : alertCountText(p.activeAlerts)}</td>
                    <td>{p.assignmentRevoked || p.adherence7 === null ? NOT_REPORTED : `${p.adherence7}%`}</td>
                    <td>{p.assignmentRevoked || p.lastActivity === 'unknown' ? NOT_REPORTED : fmt(p.lastActivity)}</td>
                    <td>{p.assignmentRevoked || p.lastSync === 'unknown' ? NOT_REPORTED : fmt(p.lastSync)}</td>
                    <td>{p.assignmentRevoked ? 'No access' : <Status value={p.syncState} />}</td>
                    <td>
                      {p.assignmentRevoked ? (
                        <Button
                          variant="secondary"
                          onClick={() => { select(p.id); location.hash = '#/summary'; }}
                          aria-label={`Open ${p.name}; assignment revoked, access will be denied`}
                        >
                          Open
                        </Button>
                      ) : (
                        <Button variant="secondary" onClick={() => { select(p.id); location.hash = '#/summary'; }}>
                          Open
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <QuarantineNotice docs={quarantinedDocs} />
        </Panel>
      )}
    </>
  );
}
