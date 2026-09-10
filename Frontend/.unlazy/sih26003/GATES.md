# Root delivery gates

- [ ] G1: production build passes
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: pending
- [ ] G2: unit checks pass
  CHECK: npm run test -- --run
  EXPECT: Test Files
  EVIDENCE: pending
- [ ] G3: static plan-completeness audit passes
  CHECK: node scripts/verify-plan-completeness.mjs
  EXPECT: plan completeness verified
  EVIDENCE: pending
