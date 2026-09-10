import { useState } from 'react';
import type { Alert } from '../../domain/models';
import { useAsync, useQuarantined } from '../../state/dashboard';
import { useDependencies } from '../../state/dependencies';
import { Button, Dialog, Empty, Notice, Panel, Skeleton, Status, useToasts, fmt } from '../../components/ui';
import { WELFARE_VERIFICATION } from '../../domain/language';
import { DeniedPanel, Page, QuarantineNotice } from '../shared';

export function Alerts({ patientId }: { patientId: string }) {
  const { repository } = useDependencies();
  const quarantined = useQuarantined(patientId);
  const { value: alertsPage, loading, error, denied } = useAsync(() => repository.alerts({ patientId, pageSize: 50 }), [patientId]);
  const [selected, setSelected] = useState<Alert>();
  const [action, setAction] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [showHistory, setShowHistory] = useState(false);
  const [severity, setSeverity] = useState('all');
  const { push, region } = useToasts();
  if (denied) return <DeniedPanel message={error!} />;
  if (error) return <Notice kind="error">{error} Refresh the view to try loading the alert queue again.</Notice>;
  if (loading || !alertsPage)
    return (
      <>
        <Page title="Alerts" sub={WELFARE_VERIFICATION} />
        <Skeleton rows={4} variant="table" />
      </>
    );

  const alerts = alertsPage?.items || [];
  const shown = alerts
    .filter((a) => showHistory || a.status === 'active' || a.status === 'unknown')
    .filter((a) => severity === 'all' || a.severity === severity);
  const act = (kind: 'Acknowledge' | 'Escalate') => {
    if (!selected) return;
    setAction('working');
    // The action travels through the repository seam so the real backend
    // writes the audited change (or reports that server confirmation is
    // still required). The acknowledged-alert escalation demonstrates the
    // concurrent-update failure path with data-driven semantics.
    const request =
      kind === 'Acknowledge'
        ? repository.acknowledgeAlert(patientId, selected.id)
        : repository.requestAlertEscalation(patientId, selected.id);
    request
      .then(() => {
        const concurrent = selected.status === 'acknowledged';
        if (kind === 'Escalate' && concurrent) {
          setAction('error');
        } else {
          setAction('success');
          push(
            kind === 'Acknowledge'
              ? 'Acknowledgement request recorded. Server confirmation is required before the alert state changes.'
              : 'Escalation request recorded. Server confirmation is required before routing proceeds.',
            'success',
          );
        }
      })
      .catch(() => setAction('error'));
  };

  return (
    <>
      <Page title="Alerts" sub={`${WELFARE_VERIFICATION} It is not evidence of an emergency or a diagnosis.`} />
      {region}
      <QuarantineNotice docs={quarantined} />
      <Panel
        title="Alert queue"
        action={
          <div className="filters">
            <label>
              Severity
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="all">All severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} /> Include
              history
            </label>
          </div>
        }
      >
        {shown.length === 0 ? (
          alerts.length === 0 ? (
            <Empty title="No alerts reported">
              There are no welfare or operational alerts for this patient. Open Device health to verify the monitoring
              pipeline is reporting.
            </Empty>
          ) : (
            <Empty title="No alerts match">Adjust the severity filter or include history to see resolved alerts.</Empty>
          )
        ) : (
          <div className="tableWrap" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Created</th>
                  <th>State</th>
                  <th>Verification context</th>
                  <th>
                    <span className="srOnly">Review</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id} className={a.duplicateOf ? 'dedup' : undefined}>
                    <td>{a.kind}</td>
                    <td>
                      <Status value={a.severity} />
                    </td>
                    <td>{fmt(a.createdAt)}</td>
                    <td>
                      <Status value={a.status} />
                    </td>
                    <td>
                      {a.duplicateOf ? (
                        <small>
                          De-duplicated by the server: this signal was collapsed into the earlier alert. {a.message}
                        </small>
                      ) : (
                        a.message
                      )}
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelected(a);
                          setAction('idle');
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Dialog
        open={!!selected}
        onClose={() => {
          setSelected(undefined);
          setAction('idle');
        }}
        title="Alert verification action"
      >
        {selected && (
          <div className="dialogContent">
            <Notice kind="warning">
              {selected.message} Confirm the appropriate human check through your clinic process. This interface does
              not diagnose an emergency.
            </Notice>
            <p>
              Current state: <Status value={selected.status} />
              {selected.acknowledgedBy && (
                <small>
                  {' '}
                  Acknowledged by {selected.acknowledgedBy} at {fmt(selected.acknowledgedAt)}
                </small>
              )}
            </p>
            {action === 'success' && (
              <Notice kind="success">
                Action request recorded. The server must confirm the update before the alert state changes here. If
                another clinician updated this alert first, the confirmed state shown after refresh is authoritative.
              </Notice>
            )}
            {action === 'error' && (
              <Notice kind="error">
                The action could not be recorded. Another clinician may have updated this alert concurrently. Reopen the
                alert to see its current server state before trying again.
              </Notice>
            )}
            {action === 'working' && <Notice>Recording the action request…</Notice>}
            <div className="dialogActions">
              <Button variant="secondary" disabled={action === 'working'} onClick={() => act('Acknowledge')}>
                Acknowledge
              </Button>
              <Button variant="danger" disabled={action === 'working'} onClick={() => act('Escalate')}>
                Escalate
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
