---
id: gov-standins-jobs
title: "Jobs-engine stand-ins replaced or relabeled as sourced estimates"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The jobs engine still holds open stand-ins (SG-WORLD-jobs-opening-seekers, -layoff-decider, -counted-choices, -counted-retiree-income, -benefits and -offer-deadline-reminder in src/core2/data/stopgaps.json). Redo them one at a time against main's current files, as the closed branch stopgaps/gov-world did against an older main. Each row ends replaced by the mechanic, or relabeled as an ESTIMATED value with its source and spread; unemployment insurance reads the state's law in force.

**Rules.** Placeholders: a stand-in row closes only by a replacement or by a labeled estimate with its source and spread, never by deleting the row alone. Replace, never layer: the old marker and its wording are deleted in the same change, and the PR body counts them. Look before you ask: read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md and search docs/ before registering or reopening anything. One model, two tiers: a counted worker or retiree is read by the same rule as a full person times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), each row handled is resolved in stopgaps.json with a one-line resolution and its marker gone, a named worker's layoff and benefit claim is shown by record id, and src/core2/jobs.test.ts, jobs-benefits tests and the tripwire tests pass.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-benefits.ts, src/core2/data/jobs/parameters.json, src/core2/data/stopgaps.json

**Notes.** Replaces the jobs share of PR #4146. The layoff decider is the business's recorded owner.

- Oct 19: SG-WORLD-jobs-opening-seekers resolved on `claude/opening-seekers-region`: opening seekers per place from that place's own rate, both tiers.
  Sent back 2026-10-20 from PR #5193 (branch claude/standins-jobs): Merge main 680fdf18aadf into claude/standins-jobs conflicts in: src/core2/modules/jobs.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first. Current replacement claim and PR are preserved.
  Sent back 2026-10-20 from PR #5211 (branch claude/opening-seekers-region): Merge conflict with main in docs/pool/items/gov-standins-jobs.md; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5193 (branch claude/standins-jobs): The code-conflict and test-heap fixes are present; the bounded test now fails when no owned layoff is found, so this is not a vacuity objection. The remaining acceptance proof is missing: docs/pool/items/gov-standins-jobs.md:20 requires a named worker's layoff and benefit-claim record IDs in a one-year buildBenchWorld run, with drawn place and seed in the body. The historical three-place counts have no seeds or record IDs, and the new test intentionally stops after a matching layoff rather than supplying that year/claim chain. The final diff only adds the test, notes and release declaration; the layoff mechanic is already on main. Provide the named proof or track the completed test-only scope separately so this main merge cannot auto-complete the unfinished gov-standins-jobs item from its current first-line pool marker. Also narrow docs/release/changes/standins-jobs-layoff.md:6: it says the test checks the best-paid-worker fallback, but jobs-layoff-owner.test.ts:50 filters to businesses with an owner and never tests that fallback. No local gate green is claimed for these morning-check gaps.; finish on that branch, merge main into it first.

Oct 19 (claude/standins-jobs): row SG-WORLD-jobs-layoff-decider closed: the owner decides in every played layoff (3 drawn places, one year each: 37 of 37, 15 of 16 and 3 of 3 at owned businesses name the owner; the one miss is a business whose owner changed since), and an organization with no owner decides as itself, so the marker is gone and a test (jobs-layoff-owner.test.ts) holds it. Left open: SG-WORLD-jobs-opening-seekers (the PR #4146 resolution says the two-level population now holds the labor force as counts; the marker is still on two lines in jobs.ts and needs a played-year check before it closes), SG-WORLD-jobs-counted-choices (#4146 called it "by design"; counted workers still decide by summed pulls, not the shared chooser, which AGENTS.md "one model, two tiers" says to replace), and the rest of the family.

Oct 21 (claude): the layoff-owner test in PR 5193 is tracked as jobs-layoff-owner-decides-test; this item (its stopgap rows and the named layoff and benefit-claim chain) stays open.
