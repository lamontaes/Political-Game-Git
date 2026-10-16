---
id: jobs-layoff-counted-staff-fillin
title: "Staff hire fills in a person who is absent in the layoff counted test"
area: world
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr: #4767
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-16 from PR #4767 (branch claude/layoff-staff-fillin): jobs-layoff-counted.test.ts replaces the regression for a counted job held by a filled-in person with assertions over arbitrary ended counted jobs. The PR body confirms the original mixed-tier layoff scenario is no longer reached, so that coverage is weakened. Preserve a fixture or generated route that fills the counted worker in before the layoff, and assert that specific job ends and stops paying; keep the returning-household fix separately. The morning check forbids weakened tests; finish on that branch, merge main into it first.
