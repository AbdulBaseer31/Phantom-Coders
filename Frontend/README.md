# SIH26003 Clinical Monitoring Dashboard

A doctor-facing React dashboard for reviewing app-derived cognitive monitoring information for patients assigned to the doctor's care team. The dashboard presents monitoring context only (trends, sessions, medication adherence, alerts, and device health) — it is not a diagnostic tool and does not make clinical diagnoses. Patients on the roster are de-identified; data shown is derived from a companion app, and welfare alerts ask for a human verification check rather than asserting an emergency.

## Tech Stack

| Package | Version |
| --- | --- |
| React | ^19.2.8 |
| TypeScript | ^6.0.3 |
| Vite | ^8.2.2 |
| Vitest | ^5.0.0 |
| ESLint | ^10.10.0 |

## Getting Started

Prerequisites: Node.js and npm.

```bash
git clone <repository-url>
cd sih26003-clinical-dashboard
npm install
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc --noEmit`) then build for production |
| `npm run typecheck` | Run TypeScript type-checking only |
| `npm run test` | Run the test suite with Vitest |
| `npm run lint` | Lint `src` with ESLint |
| `npm run check` | Full verification: typecheck, tests, then build |

## Demo Sign-In

The mock ships with fixture data. On the sign-in page:

- **Email:** `mira.sen@clinic.example`
- **Password:** `doctor-26003`
- **Clinic options:** North Clinic and South Clinic

Any other email/password combination shows the invalid-credentials state. The sign-in page also offers two fixture-only preview buttons (non-doctor and disabled account) to demonstrate the access guard.

## Data Layer

All views consume the `DashboardRepository` contract defined in `src/domain/models.ts`. The repository currently implemented is a mock (`src/data/mockRepository.ts`) serving de-identified fixture data through schema adapters. The production backend (Firebase) plugs in through this same seam — swap the provider and no view code changes. No credentials or API keys are needed to run this repository.

## Project Layout

- `src/adapters/` — Schema adapters that translate backend-style documents into domain models, with quarantine for schema-invalid data
- `src/audio/` — Audio playback service mock for protected session audio
- `src/components/` — Shared UI components (buttons, notices, trend chart, error boundary)
- `src/data/` — Fixture data and the mock repository implementation
- `src/domain/` — Domain models, repository contract, safety language, and metrics
- `src/features/` — Route-level feature views (auth, overview, patients, trends, sessions, medication, alerts, device, audit)
- `src/routes/` — Route shells (Dashboard, Legal pages)
- `src/state/` — App state providers (auth, dashboard dependencies)
- `src/styles/` — Global styles and design tokens
- `scripts/` — Verification scripts for foundation and plan completeness
