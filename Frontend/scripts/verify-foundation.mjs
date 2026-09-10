import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const app = read('src/App.tsx');
const shell = read('src/routes/Dashboard.tsx');
const models = read('src/domain/models.ts');
const repo = read('src/data/mockRepository.ts');
const registry = read('src/adapters/registry.ts');

// Views now live in feature files; verify each one exists and exports its view.
const featureViews = [
  ['src/features/overview/Overview.tsx', 'export function Overview'],
  ['src/features/patients/Summary.tsx', 'export function Summary'],
  ['src/features/trends/Trends.tsx', 'export function Trends'],
  ['src/features/sessions/Sessions.tsx', 'export function Sessions'],
  ['src/features/medication/Medication.tsx', 'export function Medication'],
  ['src/features/alerts/Alerts.tsx', 'export function Alerts'],
  ['src/features/device/Device.tsx', 'export function Device'],
  ['src/features/audit/Audit.tsx', 'export function Audit'],
];
for (const [file, marker] of featureViews) {
  const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
  if (!existsSync(path)) throw new Error(`feature view missing: ${file}`);
  if (!readFileSync(path, 'utf8').includes(marker)) throw new Error(`view export missing in ${file}`);
}

const requiredRoutes = ['overview', 'summary', 'trends', 'sessions', 'medication', 'alerts', 'device', 'audit'];
if (!requiredRoutes.every((route) => app.includes(`'${route}'`) && shell.includes(`'${route}'`))) {
  throw new Error('required dashboard routes missing');
}
if (!app.includes('Privacy Policy') || !app.includes('Terms of Service')) throw new Error('legal routes missing');
if (!app.includes('ErrorBoundary')) throw new Error('global error boundary missing');
if (!app.includes('PatientSelectionProvider') || !app.includes('DependencyProvider')) {
  throw new Error('provider wiring missing');
}

// Unknown/offline semantics must be distinct types, not zero.
if (!models.includes('adherence7: number | null')) throw new Error('nullable adherence missing');
if (!models.includes('score: number | null')) throw new Error('nullable session score missing');
if (!models.includes('AuthorizationError')) throw new Error('AuthorizationError boundary missing');
if (!models.includes('nextCursor')) throw new Error('cursor pagination contract missing');
if (!models.includes('assignmentRevoked')) throw new Error('revoked-assignment model missing');
if (!models.includes('recordAudioAttempt')) throw new Error('audio audit contract missing');

// Adapter registry must quarantine unsupported versions.
if (!registry.includes("'unsupported schema version'")) throw new Error('quarantine semantics missing');
if (!registry.includes("'missing required field'")) throw new Error('missing-field quarantine missing');
if (!registry.includes('SUPPORTED')) throw new Error('version registry missing');

// Repository must enforce assignment boundaries and per-patient quarantine.
if (!repo.includes('assertAssignment')) throw new Error('assignment authorization missing');
if (!repo.includes('revokedAssignment')) throw new Error('revoked-assignment fixture missing');
if (!repo.includes('quarantinedFor')) throw new Error('per-patient quarantine scoping missing');

// Anti-vibecoding + no-backend guardrails: no SDK imports or real API calls.
// (The word "Firebase" may legitimately appear in comments describing the
// future integration seam; only actual usage violates the phase boundary.)
const all = [app, shell, repo, registry].join('\n');
const banned = [
  /from\s+['"]firebase/,
  /getDownloadURL\s*\(/,
  /initializeApp\s*\(/,
  /firebasejs/,
  /serviceAccount/i,
  /storage\.googleapis\.com/,
  /firestore\.googleapis/,
];
for (const pattern of banned) {
  if (pattern.test(all)) throw new Error(`real backend integration found: ${pattern}`);
}
const bannedUi = ['lucide', 'backdrop-filter'];
for (const term of bannedUi) {
  if (all.toLowerCase().includes(term.toLowerCase())) throw new Error(`prohibited UI pattern found: ${term}`);
}

console.log('foundation routes verified');
