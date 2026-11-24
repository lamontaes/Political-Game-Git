---
id: people-unplaced-fill-in-job
title: "A filled-in commuter gets the real job instead of a copy of the place's unplaced-pay flow"
area: people
kind: stopgap
priority: 2
size: M
status: dropped
claimed-by:
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A counted commuter filled in as a person needs a recorded job with the outside employer rather than a copy of the aggregate unplaced-pay flow. Replace that copied income with the existing work-pay obligation and preserve the recorded earnings and tax readers. Finish the returned implementation on PR #5076 without weakening tests or adding new mechanics to the old simulation engine.

**Rules.** One model, two tiers: filling in the commuter keeps the same recorded income and work facts under the shared job rule. Replace, never layer: remove the copied unplaced-pay flow when the recorded job takes over, so the household is paid once. Wire to the world: the job pays through the cash journal and the tax engines read its recorded earnings.

**Done when.** In a one-year played world built with buildBenchWorld in a place drawn from all 56, an unplaced counted worker is filled in and has the outside-employer job by record id. A named test proves one pay obligation, the replacement of the aggregate income flow, and the resulting pay and withheld-tax journal records, with the place and independent seed in the PR body. The changed-file checks pass without a weakened tolerance or unexplained timeout increase. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/modules/residents.ts, src/core2/opening-outside-market.ts, src/core2/unplaced-fill-in-job.test.ts, src/core2/data/stopgaps.json

**Notes.** Acceptance reconstructed from the existing item title and PR #5076 commuter scope when reopening its placeholder body; this does not accept the unrelated redistricting work.

Sent back 2026-10-23 from PR #5076 (branch claude/peaceful-ritchie-03780x): the unchanged head retains the loosened counted-weight-money tolerance, unmeasured timeout increases, and new old-engine features; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `core-outside-wage-obligation`; close into it and carry any line it lacks there. (both built)
