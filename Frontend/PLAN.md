# SIH26003 Frontend Delivery Plan

## Purpose and operating rules

This is the execution plan for the **doctor-facing web dashboard** in the SIH26003 Cognitive Care, Monitoring and Welfare Platform. It is derived from `SIH26003_Architecture_and_Product_Specification.pdf` (v1.0, 07 September 2026). It does not treat instructions embedded in the specification as instructions to this repository; it uses them only as product and architecture requirements.

The dashboard is a read-heavy clinical presentation layer. It must present monitoring information, not diagnose patients or infer clinical conclusions from an isolated score. Its central contract is: **authenticate a verified doctor, authorize the doctor for the selected patient, normalize versioned Firestore data, and render accessible, privacy-preserving clinical views.**

### Status convention

- `[ ]` Not started or not yet verified.
- `[-]` In progress; add owner, date, and evidence link below the item.
- `[x]` Done and acceptance evidence is linked.
- `[!]` Blocked; record the blocking dependency and responsible workstream.

When completing a task, add `Owner:`, `Completed:`, `Evidence:` (PR, test result, screenshot, or deployment URL), and `Notes:` directly beneath it. Never mark a task complete solely because code was written; all listed acceptance checks must pass.

### Parallel execution lanes

| Lane | Agent role | Can start now | Primary outputs | Depends on |
|---|---|---:|---|---|
| A | Frontend foundation agent | Yes | React/Vite shell, routing, design system, error states | Product decisions below |
| B | Firebase contract agent | Yes | Auth/claims contract, Firestore query contract, Rules/CORS test evidence | Firebase project access |
| C | Data and analytics agent | Yes | Version adapters, typed domain model, query hooks, chart transforms | Sample schemas/fixtures |
| D | Clinical UX agent | Yes | Screen specifications, accessibility review, copy and empty states | Product owner review |
| E | Audio playback agent | After protected test audio exists | AMR-WB WASM playback component and tests | Storage/CORS/audio fixture |
| F | Quality and release agent | As soon as a route exists | Test strategy, test fixtures, CI gates, pilot checklist | Outputs from A-D |
| V1 | Logic and integrity verifier | When any implementation lane opens a change set | Read-only correctness, type-safety, error-handling, and regression report | The active change set and test commands |
| V2 | Security and data-boundary verifier | When Auth, Firebase, query, audio, or legal work changes | Read-only authorization, privacy, Rules/CORS, and sensitive-data report | Firebase contracts and relevant diff |
| V3 | UX, accessibility, and test verifier | When a UI route/component is ready to review | Read-only UX state, accessibility, anti-vibecoding, and test-coverage report | Preview/fixtures and relevant diff |

Agents may work in parallel within separate directories/modules. Before merging, the integration owner verifies the interface contracts in the “Shared contracts” section. Do not duplicate the same route, Firebase initialization, adapter, or design token work in multiple lanes.

### Verification-agent operating contract

V1, V2, and V3 are **additional, verification-only agents**. They run concurrently while A-F implement work. They may inspect diffs, source, configuration, fixtures, test results, preview builds, Firestore Rules, and browser behavior; they may run read-only analysis and tests. They must not write, refactor, format, generate, stage, commit, deploy, or otherwise modify product code, configuration, fixtures, documentation, Firebase resources, or infrastructure. Their only output is a review report with evidence and a verdict.

**Trigger and cadence:** assign the relevant verifier when an implementation agent begins a feature change set; it reviews the first reviewable increment and every subsequent handoff. The integration owner waits for the verifier’s latest verdict before merging or marking that work package complete. Verification runs alongside coding, not after the entire dashboard is finished.

**Mandatory report format:** `Scope`, `Commit/diff reviewed`, `Checks run`, `Findings` (severity and exact location), `Responsible implementation agent`, `Evidence`, `Unverified risks`, and `Verdict` (`approve`, `request changes`, or `block`). A verifier reports every defect directly to the implementation agent that owns the affected task; only that implementation agent fixes it. A new verification pass is required after every correction.

### Mandatory correction and stop-the-line protocol

An integrity, logic, security, authorization, data-boundary, privacy, or accessibility defect is a hard stop. The work package, dependent work, merge, deployment, and completion checkbox must not proceed while any such finding is unresolved.

1. The verifier records the defect with exact file/location, reproduction or failed test, expected versus actual behavior, severity, and the responsible implementation agent/task.
2. The verifier sends the finding to that responsible implementation agent. It does not implement a fix itself.
3. The responsible implementation agent corrects the root cause, not merely the visible symptom; updates or adds a regression test; and records the changed revision and test evidence.
4. The same verifier independently rechecks the correction against the original reproduction and relevant surrounding paths.
5. Only an `approve` verdict confirms that the correction is complete for the reviewed integrity/logic scope. `request changes`, `block`, an unverified risk, a skipped test, or a missing correction means **do not proceed**.
6. If a safe, validated correction is unavailable, the integration owner marks the task `[!] Blocked`, prevents dependent work and release progression, and escalates the decision to the project owner. No workaround may be represented as a verified fix.

**100% integrity and logic gate:** an implementation task may be marked `[x]` only when every applicable integrity and logic acceptance check has passed, every verifier finding has either been corrected and independently re-verified or is explicitly out of scope with project-owner approval, and the final report has no unresolved integrity or logic risk. This gate means complete verification of the agreed task scope and testable contracts; it never permits knowingly shipping a known defect.

**Minimum coverage by verifier**

| Verifier | Must verify | Must not do |
|---|---|---|
| V1 - Logic and integrity | Type safety; adapter behavior; null/missing-field handling; error and cancellation paths; pagination/query correctness; component boundaries; test failures; regressions; debug output and secret checks | Implement or “quick-fix” the reviewed code |
| V2 - Security and data boundaries | Auth/claim behavior; patient isolation; Firestore/Storage Rules; CORS allowlist; signed URL/raw-path exposure; audit action coverage; privacy/legal route linkage; client-side privilege escalation | Change Rules, Firebase settings, security code, or legal copy |
| V3 - UX, accessibility, and test quality | Keyboard, focus, semantics, contrast, reduced motion, loading/empty/error states, chart alternatives, clinical wording, anti-vibecoding guardrail, unit/component/E2E coverage | Change styles, components, tests, or content |

**Verifier checklist for every handoff**

- [ ] V1 has reviewed the active change set or recorded why it is not applicable.
- [ ] V2 has reviewed the active change set or recorded why it is not applicable.
- [ ] V3 has reviewed the active change set or recorded why it is not applicable.
- [ ] Each verifier report identifies the exact revision/diff and includes reproducible evidence.
- [ ] Every `request changes` or `block` finding is assigned to an implementation lane; verifiers do not fix it.
- [ ] The responsible implementation agent has corrected the root cause and added/updated regression evidence for every applicable finding.
- [ ] The relevant verifier has independently re-reviewed the resolution and issued `approve` before the task is marked `[x]`, merged, deployed, or allowed to unblock dependent work.
- [ ] No work package proceeds with an unresolved integrity or logic defect, skipped required verification, unverified risk, or missing correction.

## Decisions to lock before implementation

These choices were not fully prescribed by the PDF and need one accountable product/engineering decision. Until resolved, use a safe interface and avoid irreversible implementation choices.

- [ ] Confirm supported doctor sign-in method(s), session timeout, and clinic/tenant selection behavior.
- [ ] Confirm whether doctor access is strictly care-team assignment based (recommended) or a temporary universal-doctor-read policy. The specification supports either but requires Custom Claim `role: doctor` and auditing.
- [ ] Confirm the dashboard’s production, staging, and approved local-development origins for Firebase Storage CORS.
- [ ] Select the AMR-WB WASM decoder package/runtime, confirm licensing, bundle size, worker strategy, and supported browsers.
- [ ] Define the source-of-truth chart library and date/time-zone policy.
- [ ] Decide which proposed Firestore collection names are adopted as the project contract. The names in the PDF are an implementation reference, not locked source architecture.
- [ ] Define alert severity vocabulary, acknowledgement/escalation permissions, and authorized audit-log export behavior.
- [ ] Obtain de-identified Firestore fixtures for every supported `schema_version`, including missing/offline and malformed-but-quarantined cases.

## Shared contracts and non-negotiable invariants

### Frontend-to-cloud interface

- [ ] Firebase configuration is environment-specific; development, staging, and production are separate projects/environments.
- [ ] Dashboard requests use Firebase Auth and Firebase JS SDK only; no service-account credentials, permanent public URLs, or raw privileged Storage paths appear in browser code.
- [ ] Doctor access requires both a verified `role: doctor` Custom Claim and patient-assignment authorization in Firestore Rules/relationship data.
- [ ] Every clinical document is mapped through a `schema_version` adapter before a component receives it. Missing fields have explicit “unknown/not reported” semantics and never silently become zero, false, or a clinical conclusion.
- [ ] Queries are purpose-built, indexed, filtered server-side where possible, and paginated for sessions and audit logs. The dashboard must not download an entire patient history.
- [ ] Patient audio is retrieved only after authorization via Firebase `getDownloadURL`, fetched with approved bucket CORS, decoded in-browser, and never displayed as a public raw path.
- [ ] All timestamps are displayed with their relevant patient/clinic timezone and clearly distinguish last device activity from last successful cloud synchronization.
- [ ] The UI labels welfare status as a request for human verification, never as an emergency diagnosis.

### Required backend deliverables before integrated acceptance

- [ ] Firestore indexes: `gameSessions(patientUid, completedAt desc)`, `medicationEvents(patientUid, actionAt desc)`, `alerts(patientUid, status, createdAt desc)`, `auditLogs(targetPatientUid, timestamp desc)`, and detailed `telemetry(patientUid, occurredAt desc)` where used.
- [ ] Security Rules deny unauthorized doctors, cross-patient access, self-role elevation, and unassigned caregiver configuration access; emulator/integration evidence is available.
- [ ] Cloud Functions provide controlled doctor-claim assignment/removal, schema normalization/quarantine, de-duplicated welfare alerts, and audit logging.
- [ ] Storage Rules protect audio and model packs; bucket CORS allowlists only approved dashboard origins (no wildcard for clinical data).
- [ ] Test patient data includes completed, pending/offline, legacy schema, no-audio, audio-failure, and active/acknowledged-alert states.

## Build sequence and agent checklists

## Phase 0 - Product framing, UX safety, and contracts

**Owner lane:** D with B and C. **Parallelism:** Start alongside foundation work. **Exit:** signed interface and screen contract.

- [ ] Create a dashboard glossary and data-display rules: “app-derived monitoring,” “awaiting sync,” “not reported,” “no authorized access,” and welfare-verification language.
- [ ] Define responsive layouts for desktop-first clinical use and usable tablet behavior; establish loading, empty, error, unauthorized, and offline-dashboard states for every route.
- [ ] Define the patient-selection journey, filters, date ranges, and persistence of selected patient/filter state.
- [ ] Define visualizations with clear baselines, legends, units, date ranges, and tooltip content; distinguish missing/offline intervals from a value of zero.
- [ ] Define accessibility standards: high contrast, semantic landmarks, keyboard operation, visible focus, screen-reader labels, non-color-only status signals, large actionable controls, and reduced-motion behavior.
- [ ] Create de-identified UI fixtures representing each target screen state and have clinical/product stakeholders review the language.

### Anti-vibecoding design guardrail

This is a clinical dashboard, not a SaaS marketing landing page. The following are prohibited by default in production UI and copy. A deviation needs a documented accessibility, usability, or product rationale approved in review.

- [ ] Do not use harsh or text gradients, rainbow/multicolor treatments, neon, basic pastel palettes, purple-and-black “AI” styling, radial color orbs, dot grids, colored decorative stripes, sparkles, or decorative animated arrows.
- [ ] Do not use a pure-white page background, black (#000) surface, liquid-glass effects, terminal-window ornamentation, or drop shadows on every component. Use a restrained neutral surface palette, subtle borders, and elevation only when it communicates hierarchy.
- [ ] Do not default to Inter, Geist, or Space Grotesk. Choose one accessible, licensed dashboard typeface with clear numerals, test it at clinical data sizes, and document the font fallback stack.
- [ ] Do not use Lucide icons, emoji, or decorative icon clutter. Where an icon materially improves comprehension, use one approved accessible SVG icon system consistently, pair critical icons with visible text, and include an accessible name.
- [ ] Do not use generic three-feature-card rows, bento grids, fake testimonials, three pricing tiers, promotional feature comparisons, or placeholder “product demo” panels. Build only evidence-backed clinical views using live or clearly labeled de-identified fixture data.
- [ ] Do not default to excessively soft/pill-shaped corner radii or card-heavy layouts. Favor compact, consistent radii and use whitespace, dividers, and table structure for clinical data hierarchy.
- [ ] Do not use slogan-shaped copy such as “It’s not X, it’s Y,” or generic checkmark-bullet marketing copy. Use direct, specific, plain-language clinical workflow copy; do not use em dashes in UI text.
- [ ] Do not add hover animation to every control. Interactions may use brief, purposeful hover/focus/active feedback that respects reduced-motion preferences and never hides information or is required to understand a status.
- [ ] Provide layout-matched skeleton loaders for initial and refetch states; never substitute a generic spinner alone for a data-heavy screen.
- [ ] Create and link functional Terms of Service and Privacy Policy routes before pilot release. They must identify the applicable organization, current version/effective date, contact path, and approved health-data handling disclosures.

**Acceptance checklist**

- [ ] A reviewer can trace every screen to an approved user need and data source.
- [ ] No proposed copy presents an app score or inactivity signal as diagnosis/emergency proof.
- [ ] Every status has text/icon support in addition to color.
- [ ] Each empty/error state tells the doctor what happened and what safe action is available.
- [ ] A visual review confirms no prohibited anti-vibecoding pattern appears in the dashboard, route shell, loading states, legal pages, or product copy.
- [ ] Loading states use layout-matched skeletons and are announced accessibly without blocking keyboard navigation.

## Phase 1 - React/Vite foundation and application shell

**Owner lane:** A. **Parallelism:** independent of live Firebase data. **Exit:** navigable, accessible static shell.

- [ ] Initialize React + Vite with TypeScript, environment validation, linting, formatting, unit-test runner, and production build command.
- [ ] Create a feature-oriented structure: `auth`, `queries`, `adapters`, `state`, `components`, `audio`, `audit`, and route-level screens.
- [ ] Add a single Firebase client initialization module with typed environment configuration and no secrets committed to source control.
- [ ] Implement route shell, authenticated route guard placeholder, global error boundary, not-found route, and human-readable error presentation.
- [ ] Implement public Terms of Service and Privacy Policy routes with approved content ownership/version metadata; link them from the sign-in page and application footer.
- [ ] Build reusable accessible primitives: app shell, page header, patient selector, filter bar, status badge, metric card, table, pagination, chart wrapper, timeline, modal/drawer, toast, loading skeleton, and empty/error panels.
- [ ] Establish clinically appropriate typography, spacing, contrast tokens, responsive grid, and a non-color status token system.
- [ ] Add route skeletons: Login, Overview, Patient Summary, Cognitive Trends, Session Detail, Medication, Alerts, Device Health, and Audit.

**Acceptance checklist**

- [ ] `npm run build` (or project equivalent) completes without errors.
- [ ] All routes render with static fixtures, including loading/empty/error states.
- [ ] Keyboard-only navigation reaches every interactive element in a logical order.
- [ ] The global error boundary never exposes Firebase tokens, raw paths, stack traces, or patient payloads.
- [ ] Skeleton loaders match their final route layout, and public legal routes are reachable without a doctor session.

## Phase 2 - Authentication, authorization, and audit boundaries

**Owner lane:** B with A. **Parallelism:** can run with Phase 1/3. **Exit:** real doctor session safely gates data.

- [ ] Implement Firebase Auth state handling: signed out, initializing, signed in, token/claim refresh, sign-out, and expired/disabled account paths.
- [ ] Verify the `role: doctor` Custom Claim before opening clinical routes; present a clear access-denied state when absent.
- [ ] Implement assigned-patient authorization behavior that gracefully handles a revoked assignment and never retains prior patient data on screen after the permission error.
- [ ] Add authenticated user/clinic identity to the application header without exposing more patient data than necessary.
- [ ] Implement auditable clinician actions: patient-record access (as supported by backend), protected audio access/play attempt, alert acknowledgement/escalation, and authorized export request.
- [ ] Test Firebase Rules in Emulator or controlled integration tests for unauthenticated, non-doctor, unassigned doctor, assigned doctor, revoked claim, and cross-patient cases.

**Acceptance checklist**

- [ ] Non-doctors cannot reach or fetch dashboard clinical data.
- [ ] An assigned doctor can access only assigned patient data.
- [ ] Revoking a claim/assignment blocks the next protected operation after token refresh.
- [ ] Audit entries contain actor, role, target patient, action, and timestamp without recording sensitive raw audio content.

## Phase 3 - Typed data layer, schema adapters, and query hooks

**Owner lane:** C. **Parallelism:** independent implementation against fixtures. **Exit:** screens consume canonical view models only.

- [ ] Define TypeScript source types for patient, care team, device, game session, telemetry, medication event, alert, audit log, and language-pack metadata.
- [ ] Define canonical dashboard view models separately from raw Firestore documents.
- [ ] Implement a version-adapter registry keyed by `schema_version`; support current and each agreed legacy version, explicit defaults, validation failures, and unsupported-version quarantine/error treatment.
- [ ] Build focused Firestore query hooks for overview snapshots, patient summary, paginated sessions, trend windows, medication events, active/history alerts, device health, and paginated audit logs.
- [ ] Use cursors/pagination for session and audit histories; enforce date-range and patient filters in query construction.
- [ ] Expose data freshness: record timestamp, last synchronization timestamp, page refresh time, and incomplete/awaiting-sync state.
- [ ] Create deterministic fixture builders for normal, legacy, missing-field, empty, unauthorized, offline, and malformed document cases.
- [ ] Add unit tests for every adapter and query parameter builder, including missing-field semantics.

**Acceptance checklist**

- [ ] No route renders a raw Firestore document directly.
- [ ] A legacy payload renders safely and is visibly distinguishable if fields were unavailable.
- [ ] Unsupported schema data is not silently rendered as valid clinical data.
- [ ] Query tests verify patient boundary, ordering, filters, cursor pagination, and index-compatible filters.

## Phase 4 - Overview and patient summary

**Owner lanes:** A + C + D. **Exit:** a doctor can find and assess a patient’s current monitoring context.

- [ ] Build Overview: patient list, active alert count/state, adherence snapshot, last activity, last sync, search/filter controls, and entry to a patient record.
- [ ] Build Patient Summary: identity/profile fields permitted by policy, care team, medication summary, cognitive-trend summary, current welfare state, and device status.
- [ ] Add cards for 7-day/30-day medication adherence, game completion/session count, domain trajectory, response-latency summary, audio-evidence availability, device free-storage signal, and language-pack health.
- [ ] Label all cognitive data as app-derived monitoring and show data completeness/awaiting-sync status near conclusions.
- [ ] Prevent stale selected-patient content during loading, patient changes, authorization errors, and sign-out.

**Acceptance checklist**

- [ ] Overview is performant with a representative clinic patient count and does not request complete histories.
- [ ] Summary clearly differentiates last local activity from last cloud sync.
- [ ] A missing/offline interval never appears as zero adherence, zero score, or a normal welfare state.

## Phase 5 - Clinical detail views

**Owner lanes:** A + C + D. **Parallelism:** each route may be assigned to a separate agent once shared components are stable. **Exit:** all detail routes work with real adapters and fixtures.

### Cognitive trends and sessions

- [ ] Implement Cognitive Trends with date range and domain filters, domain score trajectories, recent-session trend, response-latency distribution, and item-difficulty context.
- [ ] Display baseline and completeness indicators; represent missing/offline time separately from zero scores.
- [ ] Implement Session Detail with score breakdown, item-level answers, correctness, attempts/hints, timing, adaptive context, schema/version display where clinically appropriate, and audio availability.
- [ ] Ensure session pagination and navigation do not retrieve unrelated patient sessions.

### Medication

- [ ] Implement Medication view: schedule versus Taken/Snoozed/Unable-to-take/Missed state, 7/30-day adherence trend, filters, and clearly explained incomplete data.
- [ ] Support allowed acknowledgement/note flows through authorized backend actions; do not permit dashboard edits outside the role policy.

### Alerts

- [ ] Implement Alerts view for active and historical welfare/operational alerts, severity, timestamps, de-duplication/acknowledgement state, and permitted acknowledge/escalate actions.
- [ ] Use verification-oriented language: an alert asks for a human welfare check and is not proof of an emergency.
- [ ] Render alert action failures and concurrent updates safely without implying a completed acknowledgement.

### Device health and audit

- [ ] Implement Device Health: last activity/sync, pending queue count/oldest age where exposed, storage health/block events, battery band, model-pack version/checksum status, and speech inference health.
- [ ] Implement Audit: authorized clinician access events and changes with filters and server-paginated history; add export only after policy approval.

**Acceptance checklist**

- [ ] Every chart/table is accessible, has a text alternative or summary, and remains understandable without color.
- [ ] All detail views handle no data, partial sync, legacy schema, loading, denied access, and query failure.
- [ ] Patient ID is propagated consistently and cannot be altered client-side to access another record.

## Phase 6 - Protected AMR-WB audio playback

**Owner lane:** E. **Dependency:** Phase 2 plus a protected test object, Firebase Rules, and CORS configuration. **Exit:** authorized browser playback without exposing the audio object.

- [ ] Select and integrate a browser-compatible AMR-WB WASM decoder, preferably isolated behind an `audio` service interface and worker where decoding could block the UI.
- [ ] Implement the flow: confirm Auth/authorization -> use Firebase JS SDK `getDownloadURL` -> fetch binary -> WASM decode -> Web Audio API buffer -> controlled playback.
- [ ] Build accessible playback controls: play/pause, elapsed/total duration, loading, buffered/decoding state, retry, and specific authorization/decode/network error states.
- [ ] Do not display the raw Storage path or retain permanent public URLs in UI state, logs, analytics, or copied links.
- [ ] Configure and verify GCS CORS only for approved origins; regression-test audio after each origin change.
- [ ] Handle abort/unmount, rapid play switching, decoder failure, unsupported browser behavior, missing audio, and revoked access.
- [ ] Log the approved audit event for audio access/playback attempts without logging the signed URL or audio bytes.

**Acceptance checklist**

- [ ] An authorized assigned doctor can hear a protected `.awb` fixture in every supported browser build.
- [ ] An unassigned/non-doctor user cannot obtain or play the object.
- [ ] Failed audio authorization is shown as authorization failure, not a generic network error.
- [ ] No permanent or public patient-audio URL is exposed in source, rendered DOM, logs, or test snapshots.

## Phase 7 - Integration, quality, and pilot readiness

**Owner lane:** F, with all lanes. **Exit:** release candidate passes technical and clinical UX gates.

- [ ] Add unit tests for adapters, view-model transforms, filters, freshness rules, alert language, and audio service state transitions.
- [ ] Add component tests for all screen states and keyboard/screen-reader behavior.
- [ ] Add Firebase Emulator/integration tests for Auth claims, care-team Rules, cross-patient denial, schema adapters, alerts, and protected audio authorization.
- [ ] Add end-to-end tests for login, patient selection, data filters, session pagination, alert acknowledgement, revoked authorization, schema v1-to-current render, and AMR-WB playback.
- [ ] Run accessibility audit against WCAG 2.2 AA expectations, prioritizing keyboard navigation, focus visibility, semantic names, contrast, chart/table alternatives, and error announcements.
- [ ] Run performance checks: route load, query counts, pagination behavior, bundle impact of decoder/WASM, chart rendering, and cancellation of stale requests.
- [ ] Run security review: browser configuration, secret exposure, Firestore/Storage Rules, CORS allowlists, XSS-safe rendering of external content, audit completeness, and console/log redaction.
- [ ] Produce a release runbook covering schema compatibility, Firebase environment promotion, CORS updates, decoder rollback, feature flags, alert incidents, and authorization regressions.
- [ ] Perform clinician/caregiver usability validation using de-identified scenarios and record remediation decisions.

**Release gate**

- [ ] All Phase 0-6 acceptance criteria are complete with linked evidence.
- [ ] V1, V2, and V3 have each issued a final evidence-backed verdict for the release candidate; every blocking finding has a verified resolution.
- [ ] Each release-candidate verifier report is `approve`, contains no unresolved integrity/logic risk, and confirms the mandatory correction protocol was followed.
- [ ] Firebase Rules and role tests pass before any clinical data is introduced.
- [ ] Current and prior supported `schema_version` fixtures render safely.
- [ ] Audio playback, authorization, and CORS are verified in supported browsers.
- [ ] No dashboard screen labels monitoring data as diagnosis or treats an inactivity signal as confirmed emergency.
- [ ] Production logging, audit trails, quotas/billing alerts, and operational ownership are confirmed.

## Documented tools and technologies

### Dashboard tools (direct frontend implementation)

| Tool / technology | Required use in this project |
|---|---|
| React + Vite | Doctor dashboard application shell and UI implementation. |
| TypeScript (recommended implementation detail) | Typed models, adapters, query interfaces, and safer UI state. |
| Firebase JavaScript SDK | Firebase Auth, Firestore queries, Storage `getDownloadURL`, and client integration. |
| Firebase Authentication | Doctor identity and Custom Claim-based role verification. |
| Cloud Firestore | Structured telemetry, sessions, medications, alerts, device health, care relationships, and audit records. |
| Firebase Storage / Google Cloud Storage | Protected patient audio and language-pack assets; audio is never public. |
| Firebase Security Rules | Enforce clinician role plus patient relationship authorization. |
| Firebase Cloud Functions | Claim management, schema normalization, welfare heartbeat/alerts, maintenance, and privileged operations. |
| Cloud Storage CORS configuration | Allow authorized dashboard origins to fetch protected audio. |
| Browser-side WASM AMR-WB decoder | Decode raw AMR-WB (`.awb`) because native HTML audio support cannot be assumed. |
| Web Audio API | Play decoded audio with controlled UI states. |
| Firebase Emulator / controlled integration environment | Verify Rules, claims, authorization, and data contracts before live clinical data. |

### System dependencies the frontend must respect

| Tool / technology | Why it affects dashboard work |
|---|---|
| Kotlin + Jetpack Compose | Source of offline patient data and the mobile app contract; not a dashboard implementation technology. |
| Room Database | Durable local source before sync; explains incomplete/awaiting-sync dashboard data. |
| WorkManager with `NetworkType.CONNECTED` | Sync occurs only when a network exists; dashboard must surface stale/incomplete data. |
| AlarmManager | Creates exact medication/game events reflected downstream; no dashboard responsibility for scheduling. |
| Bhashini IndicConformer, FastPitch, HiFi-GAN, TFLite select ops | Language/speech mobile runtime; dashboard uses resulting transcript/metadata only where policy permits. |
| AudioRecord + Kotlin 44.1 kHz -> 16 kHz resampling + MediaCodec AMR-WB | Produces raw AMR-WB evidence requiring browser WASM decoding. |
| Custom Claims and care-team relationships | Mandatory role/assignment model for data access. |
| FCM/SMS notification routing | Server-side welfare notification mechanism; dashboard shows status and takes permitted acknowledgement actions. |

## Traceability matrix

| Requirement | Planned implementation / verification |
|---|---|
| React/Vite doctor dashboard | Phase 1 foundation and Phase 4-5 routes. |
| Doctor claim and assignment access | Phase 2 and Firebase contract tests. |
| Firestore data never rendered raw | Phase 3 version-adapter registry and adapter tests. |
| Small, indexed, paginated queries | Phase 3 hooks and backend index checklist. |
| Overview, summary, trends, session, medication, alerts, device health, audit | Phases 4-5. |
| Offline/incomplete data distinct from zero | Phases 0, 3, 4, and 5 acceptance checks. |
| AMR-WB protected playback | Phase 6. |
| No public patient audio / no permanent URLs | Shared contracts, Phase 2 and Phase 6. |
| Welfare alert is verification, not diagnosis | Phase 0 copy rules and Phase 5 alerts acceptance. |
| Auditability | Phase 2 actions, Phase 5 Audit route, Phase 7 security gate. |

## Integration handoff checklist

- [ ] Foundation agent hands off routes, design tokens, primitives, test commands, and environment variable names.
- [ ] Firebase contract agent hands off project IDs, allowed origins, Rules/index definitions, function endpoints/contracts, and authorization test evidence.
- [ ] Data agent hands off typed canonical models, adapter coverage matrix, query-hook API, fixture set, and known schema limitations.
- [ ] UX agent hands off approved screen states, accessible copy, chart specifications, and clinical-review outcomes.
- [ ] Audio agent hands off decoder license review, browser support matrix, bundle/performance results, and protected playback test evidence.
- [ ] QA/release agent publishes a final evidence matrix mapping every unchecked/checked task to tests, screenshots, or release records.
- [ ] V1, V2, and V3 each hand off their read-only reports and verdict history; the integration owner links them to the corresponding implementation tasks.
