// Reusable clinical-safety and status wording. Views reference these
// constants so the monitoring-not-diagnosis contract stays consistent.

export const MONITORING_LABEL = 'App-derived monitoring';
export const NOT_DIAGNOSIS = 'not a clinical diagnosis';
export const WELFARE_VERIFICATION =
  'An alert asks for a human welfare check. It is not proof of an emergency.';
export const AWAITING_SYNC = 'Awaiting sync';
export const NOT_REPORTED = 'Not reported';

export const syncText: Record<string, string> = {
  current: 'Current',
  awaiting_sync: 'Awaiting sync',
  offline: 'Offline',
  unknown: 'Not reported',
};

export const statusText: Record<string, string> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  unknown: 'Not reported',
  taken: 'Taken',
  scheduled: 'Scheduled',
  snoozed: 'Snoozed',
  unable: 'Unable to take',
  missed: 'Missed',
  awaiting_sync: 'Awaiting sync',
  allowed: 'Allowed',
  denied: 'Denied',
  requested: 'Requested',
  unreported: 'Not reported',
  high: 'High severity',
  medium: 'Medium severity',
  low: 'Low severity',
};

export const domainText: Record<string, string> = {
  memory: 'Memory',
  attention: 'Attention',
  language: 'Language',
};

export const dataQualityText: Record<string, string> = {
  complete: 'Complete',
  partial: 'Partial data',
  legacy: 'Legacy schema',
  quarantined: 'Quarantined',
  unavailable: 'Unavailable',
};

// Common copy used by multiple routes.
export const REFRESH_NOTE = 'Fixture data; refreshed on load';
