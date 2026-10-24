---
id: core-effect-web-capstone-school-gate
title: "Complete the capstone school test acceptance before merging the outcome web report"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The effect-web capstone PR #5639 still marks its changed school test acceptance as not met. Its recorded failure is on the branch before the income fix, which does not establish a clean-main exception for a newly introduced test. Complete the changed school test evidence on an integrated head while preserving the positive world assertions and the separate active income-basis work.

**Rules.** Wire to the world: preserve generated-world school records and positive tested-grade and web-factor assertions. One model, two tiers: retain the counted-to-full income regression. Local gate: run only the changed-file checks and never the full suite.

**Done when.** The complete src/core2/school-outcomes.test.ts passes on the main-integrated capstone head with the named drawn place and seed, or an identical failure is demonstrated on clean main, and the PR Done-when table cites that evidence without weakening assertions.

**Files.** src/core2/school-outcomes.test.ts, docs/reports/effect-web-wiring-2026-10-20.md

**Notes.** Sent back 2026-10-23 from PR #5639 (branch effect-web-integration): the changed school checks Done-when row explicitly remains Not met and before-fix branch failure is not clean-main evidence; finish on that branch, merge main into it first. Keep world-school-income-same-tiers with its active effect-web-schools owner.
