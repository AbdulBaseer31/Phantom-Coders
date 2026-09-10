import { useAsync, usePatientSelection, useQuarantined } from '../../state/dashboard';
import { useDependencies } from '../../state/dependencies';
import { Metric, Notice, Panel, Skeleton, Status, fmt } from '../../components/ui';
import { NOT_REPORTED } from '../../domain/language';
import { DeniedPanel, Page, QuarantineNotice } from '../shared';

export function Device({ patientId }: { patientId: string }) {
  const { repository } = useDependencies();
  const quarantined = useQuarantined(patientId);
  const { value: device, loading, error, denied } = useAsync(() => repository.device(patientId), [patientId]);
  const { patients } = usePatientSelection();
  const p = patients?.find((x) => x.id === patientId);
  if (denied) return <DeniedPanel message={error!} />;
  if (error) return <Notice kind="error">{error} Refresh the view to try loading device health again.</Notice>;
  if (loading || !device)
    return (
      <>
        <Page title="Device health" sub="Operational signals indicate reported device state." />
        <Skeleton rows={4} variant="metrics" />
        <Skeleton rows={4} variant="table" />
      </>
    );
  if (!p) return <Notice kind="error">Device health is unavailable for the selected patient.</Notice>;

  return (
    <>
      <Page
        title="Device health"
        sub="Operational signals indicate reported device state. They do not communicate a patient welfare conclusion."
      />
      <QuarantineNotice docs={quarantined} />
      <div className="metricGrid">
        <Metric label="Battery" value={device.battery === null ? NOT_REPORTED : `${device.battery}%`} detail="Last device report" />
        <Metric
          label="Free storage"
          value={device.storageFreeGb === null ? NOT_REPORTED : `${device.storageFreeGb} GB`}
          detail={device.storageFreeGb !== null && device.storageFreeGb < 1 ? 'Storage block threshold' : 'Reported free device storage'}
        />
        <Metric
          label="Pending queue"
          value={device.pendingQueue === null ? NOT_REPORTED : device.pendingQueue}
          detail={device.oldestQueueHours ? `Oldest: ${device.oldestQueueHours} hours` : 'No pending queue reported'}
        />
        <Metric label="Sync state" value={<Status value={p.syncState} />} detail={`Last successful cloud sync: ${fmt(device.lastSync)}`} />
      </div>
      <Panel title="Component health">
        <div className="tableWrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Signal</th>
                <th>Current report</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Model pack</td>
                <td>
                  {device.modelVersion ?? NOT_REPORTED} ·{' '}
                  {device.modelChecksum === 'verified' ? 'Checksum verified' : 'Checksum unavailable'}
                </td>
                <td>Version and checksum reported by the device</td>
              </tr>
              <tr>
                <td>Speech inference</td>
                <td>{device.speechHealth}</td>
                <td>Operational health of on-device speech components only</td>
              </tr>
              <tr>
                <td>Last local activity</td>
                <td>{fmt(p.lastActivity)}</td>
                <td>Separate from cloud synchronization</td>
              </tr>
              <tr>
                <td>Storage action</td>
                <td>
                  {device.storageFreeGb !== null && device.storageFreeGb < 1
                    ? 'Block event reported'
                    : 'No block event reported'}
                </td>
                <td>Confirm device availability through the care workflow</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
