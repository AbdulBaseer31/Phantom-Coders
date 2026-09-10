# Foundation gate
OWNS: package.json, index.html, src/main.tsx, src/App.tsx, src/styles/**, src/components/**, src/routes/**

- [ ] G1: the application foundation builds successfully
  CHECK: npm run build
  EXPECT: built in
  EVIDENCE: pending
- [ ] G2: foundation exposes all required route names
  CHECK: node scripts/verify-foundation.mjs
  EXPECT: foundation routes verified
  EVIDENCE: pending
