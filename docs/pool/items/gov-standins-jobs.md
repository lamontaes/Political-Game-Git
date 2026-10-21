---
id: gov-standins-jobs
title: "Jobs-engine stand-ins replaced or relabeled as sourced estimates"
area: world
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/standins-jobs
pr: #5193
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:01:22.329Z
---

**What.** The jobs engine still holds open stand-ins (SG-WORLD-jobs-opening-seekers, -layoff-decider, -counted-choices, -counted-retiree-income, -benefits and -offer-deadline-reminder in src/core2/data/stopgaps.json). Redo them one at a time against main's current files, as the closed branch stopgaps/gov-world did against an older main. Each row ends replaced by the mechanic, or relabeled as an ESTIMATED value with its source and spread; unemployment insurance reads the state's law in force.

**Rules.** Placeholders: a stand-in row closes only by a replacement or by a labeled estimate with its source and spread, never by deleting the row alone. Replace, never layer: the old marker and its wording are deleted in the same change, and the PR body counts them. Look before you ask: read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md and search docs/ before registering or reopening anything. One model, two tiers: a counted worker or retiree is read by the same rule as a full person times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), each row handled is resolved in stopgaps.json with a one-line resolution and its marker gone, a named worker's layoff and benefit claim is shown by record id, and src/core2/jobs.test.ts, jobs-benefits tests and the tripwire tests pass.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-benefits.ts, src/core2/data/jobs/parameters.json, src/core2/data/stopgaps.json

**Notes.** Replaces the jobs share of PR #4146. The layoff decider is the business's recorded owner.

- Oct 19: SG-WORLD-jobs-opening-seekers resolved on `claude/opening-seekers-region`: opening seekers per place from that place's own rate, both tiers.
  Sent back 2026-10-20 from PR #5193 (branch claude/standins-jobs): Merge main 680fdf18aadf into claude/standins-jobs conflicts in: src/core2/modules/jobs.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first. Current replacement claim and PR are preserved.
  Sent back 2026-10-20 from PR #5211 (branch claude/opening-seekers-region): Merge conflict with main in docs/pool/items/gov-standins-jobs.md; finish on that branch, merge main into it first.
