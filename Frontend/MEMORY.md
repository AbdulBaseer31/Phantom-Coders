# SIH26003 project memory

## Product and scope

- This is the doctor-facing SIH26003 clinical monitoring dashboard.
- `PLAN.md` is the primary source of truth. The referenced architecture PDF was not present in the supplied repository.
- Current authorization is frontend implementation only: no Firebase, Firestore, Storage, network database query, service account, or permanent audio URL may be added.
- Use realistic, de-identified fixture data behind repository interfaces so an approved backend can replace the mock implementation without a UI rewrite.
- Monitoring is never diagnosis. Welfare alerts request a human verification and must not claim an emergency.

## UX constraints

- Compact, calm clinical dashboard; neutral surfaces; semantic status text in addition to color.
- Do not use gradients, glass effects, pure-white pages, Lucide/emoji decoration, marketing-card patterns, or generic SaaS copy.
- Show missing, offline, awaiting-sync and unknown data distinctly from zero.
- Keep patient assignment/role behavior visible in route guards and clear access-denied states.

## Implementation records

- The project was initially empty except `PLAN.md`; a Vite/React/TypeScript frontend is being created from scratch.
- Unlazy execution scope: `.unlazy/sih26003/`; depth tree and contract inventory are in `.unlazy/sih26003/PLAN.md`.
- Planned route surface: login, overview, patient summary, cognitive trends, session detail, medication, alerts, device health, audit, privacy, terms, access denied, not found.
- Primary mock boundaries: `DashboardRepository` for clinical fixture data and `AudioPlaybackService` for protected audio UI state.

## Continuation rule

Before reporting completion, reconcile every Plan.md requirement, run build/type/lint/tests, conduct independent read-only reviews (plan, flows, architecture, UX, runtime), fix legitimate findings, and re-verify them.
