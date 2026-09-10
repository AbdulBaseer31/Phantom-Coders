import { useState } from 'react';
import { useAsync, useQuarantined } from '../../state/dashboard';
import { useDependencies } from '../../state/dependencies';
import { Empty, Metric, Notice, Panel, Skeleton, Status, dateOnly } from '../../components/ui';
import { TrendChart } from '../../components/TrendChart';
import { domainAverage, averageLatency } from '../../domain/metrics';
import { difficultyContext, latencyBandsForPoints } from '../../domain/viewModels';
import { AWAITING_SYNC, NOT_REPORTED } from '../../domain/language';
import { DeniedPanel, Page, QuarantineNotice } from '../shared';

export function Trends({ patientId }: { patientId: string }) {
  const { repository } = useDependencies();
  const quarantinedDocs = useQuarantined(patientId);
  const [domain, setDomain] = useState<'memory' | 'attention' | 'language'>('memory');
  const [range, setRange] = useState<'7' | '30'>('7');
  const { value: points, loading, error, denied } = useAsync(
    () => repository.trends({ patientId, days: range === '7' ? 7 : 30 }),
    [patientId, range],
  );
  const { value: sessions } = useAsync(() => repository.sessions({ patientId, pageSize: 20 }), [patientId]);
  if (loading || !points)
    return (
      <>
        <Page title="Cognitive trends" sub="App-derived monitoring. This view supplies longitudinal context and is not a diagnosis." />
        <Skeleton rows={3} variant="metrics" />
        <Skeleton rows={4} variant="table" />
      </>
    );
  if (denied) return <DeniedPanel message={error!} />;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (points.length === 0)
    return (
      <>
        <Page title="Cognitive trends" sub="App-derived monitoring. This view supplies longitudinal context and is not a diagnosis." />
        <Empty title="No trend data reported">
          No app-derived monitoring days are available for this patient in the selected window. Check the device sync
          state before interpreting this as an absence of activity.
        </Empty>
      </>
    );

  const subset = points;
  const avg = domainAverage(subset, domain);
  const reported = subset.filter((x) => x[domain] !== null).length;
  const latency = averageLatency(subset);
  const bands = latencyBandsForPoints(subset);
  const difficulty = difficultyContext(sessions?.items ?? []);

  return (
    <>
      <Page title="Cognitive trends" sub="App-derived monitoring. This view supplies longitudinal context and is not a diagnosis." />
      <QuarantineNotice docs={quarantinedDocs} />
      <Panel title="Trend controls">
        <div className="filters">
          <label>
            Domain
            <select value={domain} onChange={(e) => setDomain(e.target.value as typeof domain)}>
              <option value="memory">Memory</option>
              <option value="attention">Attention</option>
              <option value="language">Language</option>
            </select>
          </label>
          <label>
            Date range
            <select value={range} onChange={(e) => setRange(e.target.value as '7' | '30')}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </label>
        </div>
      </Panel>
      <div className="metricGrid">
        <Metric label="Reported average" value={avg === null ? NOT_REPORTED : `${avg}/100`} detail="Only reported app-derived scores in the selected window" />
        <Metric label="Response latency" value={latency === null ? NOT_REPORTED : `${latency} ms`} detail="Reported session response timing" />
        <Metric label="Completeness" value={`${reported}/${subset.length} days`} detail="Gaps are awaiting sync, not zero" />
      </div>
      <Panel title={`${domain[0].toUpperCase() + domain.slice(1)} trajectory`}>
        <TrendChart points={subset} domain={domain} />
      </Panel>
      <Panel title="Response-latency distribution">
        <div className="tableWrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Latency band</th>
                <th>Days</th>
              </tr>
            </thead>
            <tbody>
              {bands.map((b) => (
                <tr key={b.label}>
                  <td>{b.label}</td>
                  <td>{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Recent-session difficulty context">
        {difficulty.length === 0 ? (
          <Empty title="No sessions reported">No completed sessions are available to derive difficulty context.</Empty>
        ) : (
          <div className="tableWrap" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Adaptive level</th>
                  <th>Sessions</th>
                </tr>
              </thead>
              <tbody>
                {difficulty.map((d) => (
                  <tr key={d.level ?? 'not-reported'}>
                    <td>{d.level ?? NOT_REPORTED}</td>
                    <td>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="Text alternative">
        <div className="tableWrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Score</th>
                <th>Response latency</th>
                <th>Data state</th>
              </tr>
            </thead>
            <tbody>
              {subset.map((p) => (
                <tr key={p.date}>
                  <td>{dateOnly(p.date)}</td>
                  <td>{p[domain] ?? AWAITING_SYNC}</td>
                  <td>{p.latency === null ? NOT_REPORTED : `${p.latency} ms`}</td>
                  <td>{p.state === 'awaiting_sync' ? <Status value="awaiting_sync" /> : 'Reported'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
