import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Severity, SyncState } from '../domain/models';
import { statusText, syncText } from '../domain/language';

// Clinical timestamps render in the clinic timezone (IST) regardless of the
// doctor's device timezone, matching the on-screen "Asia/Kolkata" label.
const CLINIC_TZ = 'Asia/Kolkata';

export const fmt = (iso?: string) =>
  iso && iso !== 'unknown'
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: CLINIC_TZ }).format(
        new Date(iso),
      )
    : 'Not reported';

export const dateOnly = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', timeZone: CLINIC_TZ }).format(new Date(iso));

type StatusValue =
  | SyncState
  | 'active'
  | 'acknowledged'
  | 'resolved'
  | Severity
    | 'taken'
    | 'scheduled'
    | 'snoozed'
  | 'unable'
  | 'missed'
  | 'awaiting_sync'
  | 'allowed'
  | 'denied'
  | 'requested'
  | 'unreported'
  | 'unknown';

export function Status({ value }: { value: StatusValue }) {
  const label = statusText[value] ?? syncText[value] ?? value;
  return <span className={`status ${value}`}>{label}</span>;
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: { children: ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'quiet' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button ${variant}`} type={props.type ?? 'button'} {...props}>
      {children}
    </button>
  );
}

export function Metric({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return (
    <section className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}

export function Panel({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="panel">
      {title && (
        <div className="panelHead">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

// Layout-matched skeletons: the loading shape mirrors the loaded route so
// content does not jump and screen-reader users get an accurate preview of
// the arriving structure.
export function Skeleton({ rows = 4, variant = 'rows' }: { rows?: number; variant?: 'rows' | 'metrics' | 'table' }) {
  if (variant === 'metrics') {
    return (
      <div className="skeleton" role="status" aria-label="Loading monitoring metrics">
        <div className="skeletonMetricGrid">
          {Array.from({ length: rows }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
    );
  }
  if (variant === 'table') {
    return (
      <div className="skeleton" role="status" aria-label="Loading monitoring table">
        {Array.from({ length: rows }, (_, i) => (
          <i key={i} className="tableRow" />
        ))}
      </div>
    );
  }
  return (
    <div className="skeleton" role="status" aria-label="Loading monitoring information">
      {Array.from({ length: rows }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}

export function Dialog({
  open,
  title,
  children,
  onClose,
  description,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  description?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  // Keep the latest close callback in a ref so the focus effect depends only
  // on `open`: re-renders while the dialog is open (typing, state updates)
  // must never tear focus away from the dialog.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-desc' : undefined}
        ref={ref}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="panelHead">
          <h2 id="dialog-title">{title}</h2>
          <Button variant="quiet" onClick={onClose} aria-label="Close dialog">
            Close
          </Button>
        </div>
        {description && (
          <p id="dialog-desc" className="chartNote">
            {description}
          </p>
        )}
        {children}
      </section>
    </div>
  );
}

export function Pagination({
  page,
  setPage,
  total,
  onNext,
  onPrevious,
}: {
  page: number;
  setPage: (n: number) => void;
  total: number;
  onNext?: () => void;
  onPrevious?: () => void;
}) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button
        variant="secondary"
        disabled={page === 0}
        onClick={() => {
          setPage(page - 1);
          onPrevious?.();
        }}
      >
        Previous
      </Button>
      <span aria-live="polite">
        Page {page + 1} of {Math.max(1, total)}
      </span>
      <Button
        variant="secondary"
        disabled={page >= total - 1}
        onClick={() => {
          setPage(page + 1);
          onNext?.();
        }}
      >
        Next
      </Button>
    </nav>
  );
}

export function Notice({
  children,
  kind = 'info',
}: {
  children: ReactNode;
  kind?: 'info' | 'warning' | 'error' | 'success';
}) {
  return (
    <p className={`notice ${kind}`} role={kind === 'error' ? 'alert' : undefined}>
      {children}
    </p>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: 'info' | 'success' | 'error' }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const push = (message: string, kind: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    timers.current.push(setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000));
  };
  const region = (
    <div className="toastRegion" role="region" aria-label="Status messages" aria-live="polite">
      {toasts.map((t) => (
        <output key={t.id} className={`toast ${t.kind}`}>
          {t.message}
        </output>
      ))}
    </div>
  );
  return { push, region };
}

export function ItemTimeline({
  items,
}: {
  items: { prompt: string; response: string; correct: boolean | null; attempts: number; hints: number; ms: number }[];
}) {
  return (
    <ol className="timeline">
      {items.map((item, i) => (
        <li key={i} className={item.correct === null ? 'unknown' : item.correct ? 'correct' : 'incorrect'}>
          <span className="timelineMark">{item.correct === null ? 'No report' : item.correct ? 'Correct' : 'Incorrect'}</span>
          <div>
            <p>{item.prompt}</p>
            <small>
              Response: {item.response} · Attempts: {item.attempts} · Hints: {item.hints} · Time: {item.ms} ms
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
