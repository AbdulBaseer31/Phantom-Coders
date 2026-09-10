// Shared view plumbing for dashboard feature screens: page header,
// denied/quarantine panels, and small text helpers. This file is
// presentational only; data reaches it through props.
import type { ReactNode } from 'react';
import type { QuarantinedDocument } from '../adapters/documents';
import { Button, Notice, Panel, fmt } from '../components/ui';
import { MONITORING_LABEL } from '../domain/language';

export function Page({ title, children, sub }: { title: string; children?: ReactNode; sub?: string }) {
  return (
    <>
      <div className="pageTitle">
        <div>
          <p className="eyebrow">{MONITORING_LABEL}</p>
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
        <span className="refresh">Fixture data · Loaded {fmt(new Date().toISOString())}</span>
      </div>
      {children}
    </>
  );
}

export function go(path: string) {
  location.hash = `#/${path}`;
}

export function DeniedPanel({ message }: { message: string }) {
  return (
    <Panel title="Authorization required">
      <Notice kind="error">{message}</Notice>
      <p>
        Return to the overview and select a patient currently assigned to your care team. No prior patient data remains
        on screen after an authorization failure.
      </p>
      <Button variant="secondary" onClick={() => go('overview')}>
        Back to overview
      </Button>
    </Panel>
  );
}

// Presentational notice: the caller supplies the already-scoped quarantined
// documents from the repository, so this leaf component never touches any
// data module.
export function QuarantineNotice({ docs }: { docs: QuarantinedDocument[] }) {
  if (docs.length === 0) return null;
  return (
    <Notice kind="warning">
      {docs.length} document{docs.length > 1 ? 's were' : ' was'} withheld by schema validation (unsupported or
      malformed). Quarantined data is never shown as clinical information.
    </Notice>
  );
}

export function alertCountText(count: number): string {
  if (count < 0) return 'Not reported';
  if (count === 0) return 'None';
  return `${count} alert${count > 1 ? 's' : ''}`;
}
