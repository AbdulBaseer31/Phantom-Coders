# SIH26003 frontend delivery contract (revision 1)

## Contract inventory

| ID | Required outcome | Owner | Observed by | State |
|---|---|---|---|---|
| R1 | React/Vite TypeScript dashboard foundation, routes, shell, tokens, legal pages and error states | leaf-1.1.1 | leaf gate + node | DONE |
| R2 | Mock-only typed domain, adapter registry, data repositories/query abstractions and deterministic states | leaf-1.1.2 | leaf gate + node | DONE |
| R3 | Doctor authentication/role/assignment frontend model, protected routes and action audit abstraction | leaf-1.1.3 | leaf gate + node | DONE |
| R4 | Overview and patient summary including patient filters, freshness and monitoring language | leaf-1.2.1 | node | DONE |
| R5 | Trends, sessions and protected-audio frontend experience | leaf-1.2.2 | node | DONE |
| R6 | Medication, alerts, device health and audit experiences | leaf-1.2.3 | node | DONE |
| R7 | Quality checks, accessibility review, route flow verification and final Plan audit | leaf-1.3.1 | root gate | IN PROGRESS |

## Depth tree (five levels)

```text
SIH26003 doctor-facing mock frontend
├── 1 Foundation and contracts
│   ├── 1.1 Application platform
│   │   ├── 1.1.1 Vite/TypeScript toolchain
│   │   │   ├── package scripts
│   │   │   └── production build
│   │   ├── 1.1.2 application architecture
│   │   │   ├── feature folders
│   │   │   └── backend-replaceable interfaces
│   │   └── 1.1.3 clinical interface design
│   │       ├── tokens and typography
│   │       └── semantic primitives
│   ├── 1.2 Routing and safe access
│   │   ├── public routes
│   │   │   ├── sign-in
│   │   │   └── legal routes
│   │   ├── protected routes
│   │   │   ├── role gate
│   │   │   └── assignment gate
│   │   └── recovery routes
│   │       ├── denied
│   │       └── not found/error boundary
│   └── 1.3 Data presentation rules
│       ├── unknown/offline semantics
│       │   ├── canonical value states
│       │   └── status text and symbols
│       └── clinical safety language
│           ├── monitoring labels
│           └── welfare verification wording
├── 2 Dashboard workflows
│   ├── 2.1 Overview and patient summary
│   │   ├── patient discovery
│   │   │   ├── search/filter/sort
│   │   │   └── selection persistence
│   │   ├── status and freshness
│   │   │   ├── activity vs cloud sync
│   │   │   └── incomplete/offline state
│   │   └── permitted monitoring summary
│   │       ├── teams/medication/device
│   │       └── trajectory/audio health
│   ├── 2.2 Cognitive sessions
│   │   ├── trends
│   │   │   ├── date/domain filtering
│   │   │   └── accessible longitudinal chart
│   │   ├── session history
│   │   │   ├── pagination and sorting
│   │   │   └── drill-down navigation
│   │   └── session detail
│   │       ├── item timing/answers/adaptive context
│   │       └── audio UI state machine
│   └── 2.3 Operations views
│       ├── medication
│       │   ├── adherence trend and filters
│       │   └── permitted note/acknowledgement state
│       ├── alerts
│       │   ├── active/history and severity
│       │   └── acknowledge/escalate/error/concurrency states
│       ├── device health
│       │   ├── queue/storage/battery/model/speech signals
│       │   └── offline distinction
│       └── audit
│           ├── filters and pagination
│           └── authorized export request
└── 3 Quality and release evidence
    ├── 3.1 Interaction completeness
    │   ├── controls, menus, modals and forms
    │   │   ├── keyboard paths
    │   │   └── validation and announcements
    │   └── loading, empty, error, denied and offline routes
    ├── 3.2 Accessibility
    │   ├── landmarks, focus and contrast
    │   └── chart table alternatives/reduced motion
    └── 3.3 Verification
        ├── build/type/lint/test
        ├── independent V1/V2/V3/V4/V5 review
        └── final requirement audit
```

## Dispatch table

| Leaf | Owns | Needs | Tier | Planned wave | State |
|---|---|---|---|---|---|
| leaf-1.1.1 | package.json, index.html, src/main.tsx, src/App.tsx, src/styles/**, src/components/**, src/routes/** | none | judgment | ready-1 | DONE |
| leaf-1.1.2 | src/domain/**, src/data/**, src/adapters/**, src/state/**, src/audio/** | none | judgment | ready-1 | DONE |
| leaf-1.1.3 | src/features/auth/** | none | judgment | ready-1 | DONE |
| leaf-1.2.1 | src/features/overview/**, src/features/patients/** | R1,R2,R3 | judgment | ready-2 | DONE (implemented in src/routes/Dashboard.tsx per foundation structure) |
| leaf-1.2.2 | src/features/trends/**, src/features/sessions/** | R1,R2,R3 | judgment | ready-2 | DONE (implemented in src/routes/Dashboard.tsx per foundation structure) |
| leaf-1.2.3 | src/features/medication/**, src/features/alerts/**, src/features/device/**, src/features/audit/** | R1,R2,R3 | judgment | ready-2 | DONE (implemented in src/routes/Dashboard.tsx per foundation structure) |
| leaf-1.3.1 | tests/**, scripts/** | R1-R6 | judgment | ready-3 | IN PROGRESS (review cycles) |

## Boundaries

- No Firebase SDK, database, Storage, Firestore query or real backend connection is permitted in this phase.
- Repository interfaces, adapters and audio service are mock implementations whose UI contracts can be replaced later.
- Documentation PDF referenced by Plan.md is absent from the supplied repository. Plan.md is used as the available product contract; conflicts are resolved in favor of the user's explicit frontend-only direction.
