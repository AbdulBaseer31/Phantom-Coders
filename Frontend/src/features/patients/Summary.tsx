import { useAsync, usePatientSelection, useQuarantined } from '../../state/dashboard';
import { useDependencies } from '../../state/dependencies';
import { Button, Metric, Notice, Panel, Skeleton, Status, fmt } from '../../components/ui';
import { adherencePercent, audioAvailableCount, domainAverage, averageLatency } from '../../domain/metrics';
import { windowStartISO } from '../../domain/viewModels';
import { AWAITING_SYNC, NOT_REPORTED, WELFARE_VERIFICATION } from '../../domain/language';
import { DeniedPanel, go, Page, QuarantineNotice } from '../shared';

export function Summary({ patientId }: { patientId: string }) {
  const { repository } = useDependencies();
  const { patients } = usePatientSelection();
  const quarantined = useQuarantined(patientId);
  const p = patients?.find((x) => x.id === patientId);
  const device = useAsync(() => repository.device(patientId), [patientId]);
  const meds = useAsync(() => repository.medications({ patientId, pageSize: 50 }), [patientId]);
  const trends = useAsync(() => repository.trends({ patientId, days: 7 }), [patientId]);
  const sessions = useAsync(() => repository.sessions({ patientId, pageSize: 12 }), [patientId]);
  const pack = useAsync(() => repository.languagePack(patientId), [patientId]);

  // Guards ordered: authorization, then query failure, then missing patient,
  // then loading. A generic error must never render as an eternal skeleton.
  if (device.denied || meds.denied) return <DeniedPanel message={device.error ?? meds.error ?? ''} />;
  if (device.error || meds.error)
    return (
      <Notice kind="error">{device.error ?? meds.error}. Try refreshing the overview.</Notice>
    );
  if (!p)
    return (
      <Notice kind="error">
        The selected patient record is no longer available. Return to overview and select an assigned patient.
      </Notice>
    );
  if (meds.loading || !meds.value)
    return (
      <>
        <Page title="Patient summary" sub="Data completeness is shown beside monitoring information." />
        <Skeleton rows={8} variant="metrics" />
      </>
    );

  // A true 7-day window: anchor-6 through anchor, matching the weekly trend
  // convention used elsewhere in the dashboard.
  const medsItems = meds.value?.items || [];
  const meds7 = medsItems.filter((m) => m.scheduledAt >= `${windowStartISO(7)}T00:00:00+05:30`);
  const adherence7 = adherencePercent(meds7);
  const adherence30 = adherencePercent(medsItems);
  const trendAvg = trends.value && trends.value.length > 0 ? domainAverage(trends.value, 'memory') : null;
  const latency = trends.value ? averageLatency(trends.value) : null;
  const audioCount = sessions.value ? audioAvailableCount(sessions.value.items) : 0;

  return (
    <>
      <Page
        title="Patient summary"
        sub="Data completeness is shown beside monitoring information. Missing or offline data is never interpreted as zero."
      />
      <QuarantineNotice docs={quarantined} />
      <Panel>
        <div className="profile">
          <div>
            <h2>{p.name}</h2>
            <p>
              {p.id} · {p.age} years · {p.pronouns}
            </p>
            <p>
              {p.clinic} · Preferred language: {p.language}
            </p>
          </div>
          <div>
            <b>Care team</b>
            {p.careTeam.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <div>
            <b>Current data state</b>
            <Status value={p.syncState} />
            <small>
              Last local activity: {fmt(p.lastActivity)}
              <br />
              Last cloud sync: {fmt(p.lastSync)}
            </small>
          </div>
          <div>
            <b>Welfare status</b>
            <small>
              {p.welfareState === 'no alert'
                ? 'No active welfare alert.'
                : p.welfareState === 'verification requested'
                  ? `A welfare verification is requested. ${WELFARE_VERIFICATION}`
                  : p.welfareState === 'acknowledged'
                    ? 'The welfare check was acknowledged by the care team.'
                    : 'Welfare state not reported by the monitoring service.'}
            </small>
          </div>
        </div>
      </Panel>
      <div className="metricGrid">
        <Metric
          label="Medication adherence, 7 days"
          value={adherence7 === null ? NOT_REPORTED : `${adherence7}%`}
          detail="App-recorded events only"
        />
        <Metric
          label="Medication adherence, 30 days"
          value={adherence30 === null ? NOT_REPORTED : `${adherence30}%`}
          detail="Reported events over 30 days"
        />
        <Metric
          label="Game sessions, 7 days"
          value={p.sessions7 === null ? AWAITING_SYNC : p.sessions7}
          detail="Completed sessions"
        />
        <Metric
          label="Memory trajectory, 7 days"
          value={trendAvg === null ? NOT_REPORTED : `${trendAvg}/100`}
          detail="App-derived average"
        />
        <Metric
          label="Response latency, 7 days"
          value={latency === null ? NOT_REPORTED : `${latency} ms`}
          detail="Reported session timing"
        />
        <Metric
          label="Audio evidence"
          value={sessions.value ? `${audioCount} available` : '…'}
          detail="Per-session authorization still required"
        />
        <Metric
          label="Device free storage"
          value={!device.value ? '…' : device.value.storageFreeGb === null ? NOT_REPORTED : `${device.value.storageFreeGb} GB`}
          detail="Free space reported by device"
        />
        <Metric
          label="Language pack"
          value={!pack.value ? '…' : `${pack.value.language} · ${pack.value.packVersion ?? NOT_REPORTED}`}
          detail={`Checksum ${pack.value?.checksum ?? NOT_REPORTED}`}
        />
      </div>
      <Panel title="Monitoring context">
        <div className="twoCol">
          <div>
            <h3>Medication</h3>
            <p>Review scheduled and reported medication events. Incomplete sync is explicitly marked in the medication view.</p>
            <Button variant="secondary" onClick={() => go('medication')}>
              Open medication
            </Button>
          </div>
          <div>
            <h3>Cognitive monitoring</h3>
            <p>View app-derived domain trajectories and response-latency context over a selected period.</p>
            <Button variant="secondary" onClick={() => go('trends')}>
              Open trends
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
}
