# Quality and release evidence leaf gate
OWNS: tests/**, scripts/**

- [ ] G1: production build passes
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: pending
- [ ] G2: full unit suite passes
  CHECK: npm run test -- --run
  EXPECT: Test Files
  EVIDENCE: pending
- [ ] G3: lint passes with no errors
  CHECK: npm run lint
  EXPECT: eslint
  EVIDENCE: pending
- [ ] G4: static plan-completeness audit passes
  CHECK: node scripts/verify-plan-completeness.mjs
  EXPECT: plan completeness verified
  EVIDENCE: pending
- [ ] G5: foundation route audit passes
  CHECK: node scripts/verify-foundation.mjs
  EXPECT: foundation routes verified
  EVIDENCE: pending
