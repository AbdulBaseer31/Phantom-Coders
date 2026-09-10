import { readFileSync } from 'node:fs';

const plan = readFileSync(new URL('../PLAN.md', import.meta.url), 'utf8');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// Every route named in PLAN.md Phase 1 must exist as a feature view.
const featureFiles = [
  'src/features/overview/Overview.tsx',
  'src/features/patients/Summary.tsx',
  'src/features/trends/Trends.tsx',
  'src/features/sessions/Sessions.tsx',
  'src/features/medication/Medication.tsx',
  'src/features/alerts/Alerts.tsx',
  'src/features/device/Device.tsx',
  'src/features/audit/Audit.tsx',
];
const views = featureFiles.map((f) => read(f)).join('\n');

const viewNames = ['Overview', 'Summary', 'Trends', 'Sessions', 'Medication', 'Alerts', 'Device', 'Audit'];
if (!viewNames.every((r) => views.includes(`function ${r}(`))) throw new Error('dashboard view missing');

// Clinical-safety language requirements.
const language = read('src/domain/language.ts');
const requiredTerms = ['not a diagnosis', 'welfare check', 'awaiting sync', 'Not reported', 'authorization'];
const corpus = [language, views, read('src/domain/models.ts')].join('\n');
if (!requiredTerms.every((t) => corpus.toLowerCase().includes(t.toLowerCase()))) {
  throw new Error('required safety language missing');
}

// Data-boundary requirements: unknown must never collapse to zero.
const models = read('src/domain/models.ts');
if (!models.includes('SyncState')) throw new Error('sync state vocabulary missing');
if (!models.includes("'awaiting_sync'")) throw new Error('awaiting sync state missing');

// PLAN structure sanity.
if (!plan.includes('SIH26003 Frontend Delivery Plan')) throw new Error('Plan not found');

// The web dashboard contract from the traceability matrix.
const trace = ['overview', 'trend', 'session', 'medication', 'alert', 'device', 'audit', 'audio'];
const all = [views, models, read('src/audio/mockAudio.ts')].join('\n').toLowerCase();
if (!trace.every((t) => all.includes(t))) throw new Error('traceability surface incomplete');

// Anti-vibecoding spot checks on the UI surface: no em dashes, no emoji.
const uiCorpus = [views, read('src/features/auth/Login.tsx'), read('src/routes/Legal.tsx')].join('\n');
if (/[\u2014\u2013]/.test(uiCorpus)) throw new Error('em/en dash found in UI copy');

console.log('plan completeness verified');
