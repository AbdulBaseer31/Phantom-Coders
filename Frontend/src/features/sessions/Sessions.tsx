import { useEffect, useState } from 'react';
import type { Session } from '../../domain/models';
import { useAsync, useQuarantined } from '../../state/dashboard';
import { useDependencies } from '../../state/dependencies';
import {
  Button,
  Dialog,
  Empty,
  ItemTimeline,
  Metric,
  Notice,
  Pagination,
  Panel,
  Skeleton,
  fmt,
} from '../../components/ui';
import { AWAITING_SYNC, NOT_REPORTED } from '../../domain/language';
import { DeniedPanel, Page, QuarantineNotice } from '../shared';

const SESSION_PAGE_SIZE = 3;

type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'denied' | 'unavailable';

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export function Sessions({ patientId }: { patientId: string }) {
  const { repository, audioService } = useDependencies();
  const quarantinedDocs = useQuarantined(patientId);
  const [selected, setSelected] = useState<Session>();
  const [sort, setSort] = useState<'new' | 'score'>('new');
  const [audio, setAudio] = useState<AudioState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  // Cursor-paginated session history: each page is fetched on demand through
  // the repository's nextCursor, never a whole-history download.
  const [pages, setPages] = useState<Session[][]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(true);
  const { value: firstPage, loading, error, denied } = useAsync(
    () => repository.sessions({ patientId, pageSize: SESSION_PAGE_SIZE }),
    [patientId],
  );
  useEffect(() => {
    if (firstPage) {
      setPages([firstPage.items]);
      setMore(firstPage.nextCursor !== null);
      setPage(0);
    }
  }, [firstPage]);

  const loadNext = async () => {
    const last = pages[pages.length - 1];
    if (last.length === 0) return;
    const next = await repository.sessions({
      patientId,
      pageSize: SESSION_PAGE_SIZE,
      before: last[last.length - 1].completedAt,
    });
    setPages((p) => [...p, next.items]);
    setMore(next.nextCursor !== null);
  };

  // Audio playback clock advances only while playing; stopped audio clears
  // the interval, and unmount or dialog close leaves no dangling timer.
  useEffect(() => {
    if (audio !== 'playing') return;
    const t = setInterval(() => setElapsed((e) => Math.min(e + 1, duration || 42)), 1000);
    return () => clearInterval(t);
  }, [audio, duration]);
  useEffect(
    () => () => {
      setAudio('idle');
    },
    [],
  );

  if (loading || !firstPage)
    return (
      <>
        <Page title="Session detail" sub="Review a selected app session and item-level context." />
        <Skeleton rows={6} variant="table" />
      </>
    );
  if (denied) return <DeniedPanel message={error!} />;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (firstPage.items.length === 0)
    return (
      <>
        <Page title="Session detail" sub="Review a selected app session and item-level context." />
        <Empty title="No sessions reported">
          No completed app sessions are available for this patient. Verify the device sync state in Device health
          before interpreting this as an absence of activity.
        </Empty>
      </>
    );

  // Newest-first paging follows server cursor order. The score sort reorders
  // only the pages already loaded (labeled client-side window in the UI);
  // it never fetches unrelated patients' sessions.
  const loaded = pages.flat();
  const current = pages[Math.min(page, pages.length - 1)] ?? [];
  const visible =
    sort === 'new'
      ? current
      : [...loaded]
          .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
          .slice(page * SESSION_PAGE_SIZE, page * SESSION_PAGE_SIZE + SESSION_PAGE_SIZE);

  const play = async () => {
    if (!selected) return;
    setAudio('loading');
    try {
      const result = await audioService.request({ session: selected });
      setDuration(result.durationSec);
      setElapsed(0);
      setAudio('playing');
      void repository.recordAudioAttempt(patientId, selected.id, 'allowed');
    } catch (e) {
      const name = (e as Error).name;
      const outcome: AudioState =
        name === 'AuthorizationFailure' ? 'denied' : name === 'AudioUnavailable' ? 'unavailable' : 'error';
      setAudio(outcome);
      void repository.recordAudioAttempt(patientId, selected.id, outcome === 'denied' ? 'denied' : 'allowed');
    }
  };

  return (
    <>
      <Page
        title="Session detail"
        sub="Review a selected app session and item-level context. Sessions are scoped to the selected patient."
      />
      <QuarantineNotice docs={quarantinedDocs} />
      <Panel
        title="Session history"
        action={
          <label>
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as typeof sort);
                setPage(0);
              }}
            >
              <option value="new">Newest first</option>
              <option value="score">Score, high to low</option>
            </select>
          </label>
        }
      >
        <div className="tableWrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Completed</th>
                <th>Game / domain</th>
                <th>Score</th>
                <th>Latency</th>
                <th>Data schema</th>
                <th>Audio</th>
                <th>
                  <span className="srOnly">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>{fmt(s.completedAt)}</td>
                  <td>
                    {s.game}
                    <small>{s.domain ?? 'Domain not reported'}</small>
                  </td>
                  <td>{s.score ?? AWAITING_SYNC}</td>
                  <td>{s.latency ? `${s.latency} ms` : NOT_REPORTED}</td>
                  <td>
                    {s.schemaVersion}
                    {s.dataQuality === 'legacy' && <small>Legacy schema: some fields may be unavailable</small>}
                  </td>
                  <td>{s.audio === 'available' ? 'Available' : s.audio === 'unavailable' ? 'None reported' : 'Not authorized'}</td>
                  <td>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelected(s);
                        setAudio('idle');
                        setElapsed(0);
                      }}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          setPage={setPage}
          total={
            sort === 'new'
              ? more
                ? page + 2
                : page + 1
              : Math.max(1, Math.ceil(loaded.length / SESSION_PAGE_SIZE))
          }
          onNext={() => {
            if (sort === 'new' && page === pages.length - 1 && more) void loadNext();
          }}
        />
        <p className="chartNote">
          {sort === 'new'
            ? 'Pages load on demand from the session history, following the server cursor.'
            : 'Score sorting reorders the already loaded session window client-side; it never fetches other patients.'}
        </p>
      </Panel>
      <Dialog
        open={!!selected}
        onClose={() => {
          setSelected(undefined);
          setAudio('idle');
        }}
        title="Session context"
      >
        {selected && (
          <div className="dialogContent">
            <p>
              {selected.game} · {selected.domain ?? 'Domain not reported'} · completed {fmt(selected.completedAt)}
            </p>
            <div className="metricGrid compact">
              <Metric label="Score" value={selected.score ?? AWAITING_SYNC} detail={selected.dataQuality === 'legacy' ? 'Legacy schema: fields may be missing' : 'App-derived result'} />
              <Metric label="Latency" value={selected.latency === null ? NOT_REPORTED : `${selected.latency} ms`} detail="Mean response time" />
              <Metric label="Adaptive level" value={selected.difficulty ?? NOT_REPORTED} detail="Difficulty context" />
              <Metric label="Attempts / hints" value={`${selected.attempts} / ${selected.hints}`} detail="Reported during the session" />
            </div>
            <h3>Item timeline</h3>
            <ItemTimeline items={selected.items} />
            <h3>Protected session audio</h3>
            {audio === 'idle' && (
              <p>
                Audio evidence plays only after per-session authorization. This fixture never exposes a raw object path
                or permanent URL. Play attempts are recorded in the audit history.
              </p>
            )}
            {audio === 'playing' && (
              <Notice kind="info">
                Playing protected evidence · {clock(elapsed)} / {clock(duration)}{' '}
                <Button variant="quiet" onClick={() => setAudio('paused')}>
                  Pause
                </Button>
              </Notice>
            )}
            {audio === 'paused' && (
              <Notice>
                Paused · {clock(elapsed)} / {clock(duration)}{' '}
                <Button variant="quiet" onClick={() => setAudio('playing')}>
                  Resume
                </Button>
              </Notice>
            )}
            {audio === 'loading' && <Notice>Authorizing and preparing audio.</Notice>}
            {audio === 'denied' && (
              <Notice kind="error">Authorization failure. Your current assignment no longer allows protected audio playback.</Notice>
            )}
            {audio === 'unavailable' && <Notice kind="warning">No audio evidence was reported for this session.</Notice>}
            {audio === 'error' && (
              <Notice kind="error">Audio could not be decoded or played. Retry if the authorization remains active.</Notice>
            )}
            {audio !== 'playing' && audio !== 'paused' && (
              <Button onClick={play} disabled={audio === 'loading' || selected.audio === 'unavailable'}>
                {audio === 'error' ? 'Retry playback' : 'Play protected audio'}
              </Button>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
