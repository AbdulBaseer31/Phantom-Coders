# Medication, alerts, device health and audit leaf gate
OWNS: src/features/medication/**, src/features/alerts/**, src/features/device/**, src/features/audit/**

- [ ] G1: application builds with the operations views
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: pending
- [ ] G2: metric and language safety checks pass
  CHECK: npm run test -- --run
  EXPECT: Test Files
  EVIDENCE: pending
