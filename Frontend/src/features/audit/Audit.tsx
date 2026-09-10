import { useEffect, useState } from 'react';
import type { AuditEvent, Page } from '../../domain/models';
import { useAsync, useQuarantined } from '../../state/dashboard';
import { useDependencies } from '../../state/dependencies';
import { Button, Empty, Notice, Pagination, Panel, Skeleton, Status, fmt } from '../../components/ui';
import { DeniedPanel, Page as PageHeader, QuarantineNotice } from '../shared';

const AUDIT_PAGE_SIZE = 5;

type AuditPageItems = Page<AuditEvent>['items'];

export function Audit({ patientId }: { patientId: string }) {
  const { repository } = useDependencies();
  const quarantined = useQuarantined(patientId);
  const [result, setResult] = useState('all');
  const [query, setQuery] = useState('');
  const [exportState, setExportState] = useState<'idle' | 'requested' | 'denied'>('idle');
  // Filters apply on explicit button press: typing never fires a query and
  // never resets an already-loaded page. The applied values are committed
  // to the query deps only when the doctor presses Apply.
  const [appliedResult, setAppliedResult] = useState('all');
  const [appliedSearch, setAppliedSearch] = useState('');
  const typedResult =
    appliedResult === 'allowed' || appliedResult === 'denied' || appliedResult === 'requested'
      ? appliedResult
      : undefined;
  const { value: firstPage, loading, error, denied, reload } = useAsync(
    () =>
      repository.audit({
        patientId,
        pageSize: AUDIT_PAGE_SIZE,
        result: typedResult,
        search: appliedSearch || undefined,
      }),
    [patientId, appliedResult, appliedSearch],
  );
  const [pages, setPages] = useState<AuditPageItems[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);
  const [nextError, setNextError] = useState(false);
  useEffect(() => {
    if (firstPage) {
      setPages([firstPage.items]);
      setMore(firstPage.nextCursor !== null);
      setPage(0);
    }
  }, [firstPage]);
  const loadNext = async () => {
    if (loadingNext) return; // in-flight guard: rapid Next clicks cannot duplicate pages
    const last = pages[pages.length - 1];
    if (!last || last.length === 0) return;
    setLoadingNext(true);
    setNextError(false);
    try {
      const next = await repository.audit({
        patientId,
        pageSize: AUDIT_PAGE_SIZE,
        result: typedResult,
        search: appliedSearch || undefined,
        cursor: last[last.length - 1].id,
      });
      setPages((p) => [...p, next.items]);
      setMore(next.nextCursor !== null);
    } catch {
      setNextError(true);
    } finally {
      setLoadingNext(false);
    }
  };

  if (denied) return <DeniedPanel message={error!} />;
  if (error) return <Notice kind="error">{error} Refresh the view to try loading the audit history again.</Notice>;
  // While (re)loading with no committed page yet: skeleton. With committed
  // pages: keep the loaded table (no empty-error flash). The !firstPage
  // error branch lives above, so this skeleton is the only fallback left.
  if ((loading && pages.length === 0) || !firstPage)
    return (
      <>
        <PageHeader title="Audit" sub="Authorized clinician actions as server-paginated history." />
        <Skeleton rows={6} variant="table" />
      </>
    );

  const current = pages[Math.min(page, pages.length - 1)] ?? [];
  const loadedCount = pages.reduce((a, p) => a + p.length, 0);

  return (
    <>
      <PageHeader
        title="Audit"
        sub="Authorized clinician actions are presented as server-paginated history. This view never contains audio bytes or protected URLs."
      />
      <QuarantineNotice docs={quarantined} />
      <Panel
        title="Audit filters"
        action={
          <Button
            variant="secondary"
            onClick={() =>
              setExportState(exportState === 'idle' ? 'requested' : exportState === 'requested' ? 'denied' : 'idle')
            }
          >
            {exportState === 'idle' ? 'Request authorized export' : 'Reset export request'}
          </Button>
        }
      >
        <div className="filters">
          <label>
            Action search
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setAppliedSearch(query);
                  setAppliedResult(result);
                }
              }}
              placeholder="Search action, then press Apply"
            />
          </label>
          <label>
            Result
            <select value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="all">All results</option>
              <option value="allowed">Allowed</option>
              <option value="denied">Denied</option>
              <option value="requested">Requested</option>
            </select>
          </label>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => {
              setAppliedSearch(query);
              setAppliedResult(result);
              reload();
            }}
          >
            Apply filters
          </Button>
        </div>
        {exportState === 'requested' && (
          <Notice kind="success">Export request recorded. Policy authorization is required before any data is prepared.</Notice>
        )}
        {exportState === 'denied' && <Notice kind="error">Export request was not authorized for this session.</Notice>}
        {loading && pages.length > 0 && <Notice>Refreshing the audit history with the applied filters…</Notice>}
        {nextError && (
          <Notice kind="error">
            The next history page could not be loaded. Press Next again to retry, or reload the view.
          </Notice>
        )}
        <div className="tableWrap" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {current.map((e) => (
                <tr key={e.id}>
                  <td>{fmt(e.timestamp)}</td>
                  <td>{e.actor}</td>
                  <td>{e.role}</td>
                  <td>{e.action}</td>
                  <td>
                    <Status value={e.result} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loadedCount === 0 ? (
          <Empty title="No audit events match">Adjust the filters to view this patient's authorized activity history.</Empty>
        ) : (
          <>
            <Pagination
              page={page}
              setPage={setPage}
              total={more ? page + 2 : page + 1}
              onNext={() => {
                if (page === pages.length - 1 && more) void loadNext();
              }}
            />
            <p className="chartNote">
              History pages load on demand following the server cursor; filters apply to the audit query when you press
              Apply.
            </p>
          </>
        )}
      </Panel>
    </>
  );
}
