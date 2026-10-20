---
id: bench-dev-why-year-ledger-red
title: "dev-why test: a person's year ledger lists pay, hours and cash is false (La Liga, Puerto Rico, seed 4b22c467924caecf)"
area: play
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/n3-bench-dev-why-year-ledger-red
pr: #4974
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T15:42:44.411Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #4974 (branch claude/dev-why-ledger-s5): narrows dev-why.test.ts to pick only a paid worker, hiding the unpaid-public-worker bug; the test must stay red until world-public-employer-staff-never-paid is fixed or pick its subject without excluding the bug; finish on that branch, merge main into it first.
