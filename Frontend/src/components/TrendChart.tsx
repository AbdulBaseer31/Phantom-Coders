import type { TrendPoint } from '../domain/models';
import { dateOnly } from './ui';

// Accessible longitudinal chart: SVG line with explicit gap markers for
// awaiting-sync days (never drawn as zero), text table alternative rendered
// by the parent view.
export function TrendChart({ points, domain }: { points: TrendPoint[]; domain: 'memory' | 'attention' | 'language' }) {
  const width = 640;
  const height = 180;
  const pad = { top: 16, right: 12, bottom: 26, left: 12 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  const x = (i: number) => pad.left + i * step;
  const y = (v: number) => pad.top + innerH - (v / 100) * innerH;

  const segments: string[] = [];
  let current = '';
  points.forEach((p, i) => {
    const v = p[domain];
    if (v === null || v === undefined) {
      if (current) {
        segments.push(current);
        current = '';
      }
    } else if (!current) {
      current = `M${x(i)},${y(v)}`;
    } else {
      current += ` L${x(i)},${y(v)}`;
    }
  });
  if (current) segments.push(current);

  const reportedValues = points.map((p) => p[domain]).filter((v): v is number => v !== null && v !== undefined);
  const reported = reportedValues.length;
  // Baseline indicator: the patient's own reported average for the window,
  // so the doctor reads each day against this patient's context, not a
  // arbitrary scale midpoint.
  const baseline = reported > 0 ? Math.round(reportedValues.reduce((a, b) => a + b, 0) / reported) : null;
  const labelDates = points.filter((_, i) => i % Math.max(1, Math.ceil(points.length / 6)) === 0);

  return (
    <div className="chartWrap">
      <svg
        className="chart"
        role="img"
        aria-labelledby="chart-title chart-desc"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title id="chart-title">{domain} app-derived monitoring trend</title>
        <desc id="chart-desc">
          Longitudinal daily scores on a 0 to 100 scale. {reported} of {points.length} days reported.
          {baseline !== null ? ` Baseline: the patient's reported average for this window is ${baseline}.` : ''}{' '}
          Crossed markers indicate awaiting-sync gaps, not a score of zero.
        </desc>
        <line x1={pad.left} y1={y(0)} x2={width - pad.right} y2={y(0)} />
        {baseline !== null && (
          <line className="baseline" x1={pad.left} y1={y(baseline)} x2={width - pad.right} y2={y(baseline)} />
        )}
        {segments.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {points.map((p, i) => {
          const v = p[domain];
          if (v === null || v === undefined) {
            const cx = x(i);
            const cy = pad.top + innerH / 2;
            return (
              <g key={i} className="gapMark" aria-label={`${p.date} awaiting sync`}>
                <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} />
                <line x1={cx - 6} y1={cy + 6} x2={cx + 6} y2={cy - 6} />
              </g>
            );
          }
          return <circle key={i} cx={x(i)} cy={y(v)} r={3.5} />;
        })}
      </svg>
      <div className="chartLabels">
        {labelDates.map((p) => (
          <span key={p.date}>{dateOnly(p.date)}</span>
        ))}
      </div>
      <p className="chartNote">
        Solid line: reported app-derived score. Crossed marker: awaiting sync, not a score of zero.
        {baseline !== null
          ? ` Dashed baseline: this patient's reported average for the window (${baseline}/100).`
          : ' No baseline is shown because no days in this window are reported.'}
      </p>
    </div>
  );
}
