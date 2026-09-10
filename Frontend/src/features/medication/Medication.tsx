import { useState } from 'react';
import { useAsync, useQuarantined } from '../../state/dashboard';
import { useDependencies } from '../../state/dependencies';
import { Button, Dialog, Empty, Metric, Notice, Panel, Skeleton, Status, useToasts, fmt } from '../../components/ui';
import { adherencePercent } from '../../domain/metrics';
import { CLOCK_ANCHOR, weeklyAdherence, windowStartISO } from '../../domain/viewModels';
import { NOT_REPORTED } from '../../domain/language';
import { DeniedPanel, Page, QuarantineNotice } from '../shared';

export function Medication({ patientId }: { patientId: string }) {
  const { repository } = useDependencies();
  const quarantined = useQuarantined(patientId);
  const { value: itemsPage, loading, error, denied } = useAsync(() => repository.medications({ patientId, pageSize: 50 }), [patientId]);
  const [filter, setFilter] = useState('all');
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const { push, region } = useToasts();
  if (denied) return <DeniedPanel message={error!} />;
  if (error)
    return (
      <Notice kind="error">{error} Refresh the view to try loading the medication schedule again.</Notice>
    );
  if (loading || !itemsPage)
    return (
      <>
        <Page title="Medication" sub="Reported medication events are monitoring context." />
        <Skeleton rows={3} variant="metrics" />
        <Skeleton rows={6} variant="table" />
      </>
    );
  const items = itemsPage?.items || [];
  if (items.length === 0)
    return (
      <>
        <Page title="Medication" sub="Reported medication events are monitoring context." />
        <Empty title="No medication schedule reported">
          No scheduled medication events are available for this patient. Confirm the care plan with the clinic record.
        </Empty>
      </>
    );

  const shown = items.filter((x) => filter === 'all' || x.state === filter);
  const meds7 = items.filter((m) => m.scheduledAt >= `${windowStartISO(7)}T00:00:00+05:30`);
  const adherence7 = adherencePercent(meds7);
  const weekly = weeklyAdherence(items, 4, CLOCK_ANCHOR);
  const week4 = weekly.map((w) => w.percent).filter((v): v is number => v !== null);
  const trend30 = week4.length ? Math.round(week4.reduce((a, b) => a + b, 0) / week4.length) : null;

  return (
    <>
      <Page title="Medication" sub="Reported medication events are monitoring context. Awaiting sync is distinct from a missed dose." />
      {region}
      <QuarantineNotice docs={quarantined} />
      <div className="metricGrid">
        <Metric label="7-day reported adherence" value={adherence7 === null ? NOT_REPORTED : `${adherence7}%`} detail="Reported events in the last 7 days" />
        <Metric label="30-day adherence trend" value={trend30 === null ? NOT_REPORTED : `${trend30}%`} detail="Four-week average of reported events" />
        <Metric label="Incomplete events" value={items.filter((x) => x.state === 'awaiting_sync').length} detail="Awaiting sync, not missed" />
      </div>
      <Panel
        title="Medication events"
        action={
          <Button variant="secondary" onClick={() => setNoteOpen(true)}>
            Add authorized note
          </Button>
        }
      >
        <div className="filters">
          <label>
            Event state
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All events</option>
              <option value="taken">Taken</option>
              <option value="snoozed">Snoozed</option>
              <option value="unable">Unable to take</option>
              <option value="missed">Missed</option>
              <option value="awaiting_sync">Awaiting sync</option>
            </select>
          </label>
        </div>
        <div className="tableWrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Scheduled</th>
                <th>Reported action</th>
                <th>State</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id}>
                  <td>{m.medicine}</td>
                  <td>{fmt(m.scheduledAt)}</td>
                  <td>{m.actionAt ? fmt(m.actionAt) : 'Not yet reported'}</td>
                  <td>
                    <Status value={m.state} />
                  </td>
                  <td>{m.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && (
          <Empty title="No events match this filter">Select another event state to see reported medication activity.</Empty>
        )}
      </Panel>
      <Panel title="Weekly adherence trend">
        <div className="tableWrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Reported adherence</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.weekLabel}>
                  <td>{w.weekLabel}</td>
                  <td>
                    {w.percent === null ? (
                      `${NOT_REPORTED} (no reported events)`
                    ) : (
                      <span className="bar">
                        <span className="barFill" style={{ width: `${w.percent}%` }} />
                        {w.percent}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} title="Authorized medication follow-up note">
        <label>
          Note
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            placeholder="Record an authorized follow-up note"
          />
        </label>
        {saved && (
          <Notice kind="success">
            Note request recorded in this frontend fixture. Server authorization is required before a real change.
          </Notice>
        )}
        <Button
          onClick={() => {
            if (note.trim()) {
              setSaved(true);
              push('Note request queued for authorization.', 'success');
            }
          }}
        >
          Request save
        </Button>
      </Dialog>
    </>
  );
}
