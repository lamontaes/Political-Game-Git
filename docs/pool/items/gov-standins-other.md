---
id: gov-standins-other
title: "Credit, business, staff, budgets, legislature and macro stand-ins replaced or relabeled as sourced estimates"
area: gov
kind: stopgap
priority: 2
size: M
status: blocked
claimed-by: claude/standins-other-credit-business
pr: #5155
blocked-on: gov-standin-budgets-adopted-by-rule
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:25:48.884Z
---

**What.** The credit, business, staff, budgets, legislature and macro engines still hold open stand-ins (for example SG-WORLD-credit-business-applies, SG-WORLD-macro-mortgage-spread, SG-GOV-staff-hire-out-of-work, SG-GOV-staff-unpaid, SG-GOV-budget-adopted-by-rule, SG-GOV-committee-structure, SG-P8-business-books-priors and SG-WORLD-business-compliance-cost in src/core2/data/stopgaps.json). Redo them one area at a time against main's current files, as the closed branch stopgaps/gov-world did against an older main. Each row ends replaced, or relabeled as an ESTIMATED value with its source and spread.

**Rules.** Placeholders: a stand-in row closes only by a replacement or by a labeled estimate with its source and spread, never by deleting the row alone. Replace, never layer: the old marker and its wording are deleted in the same change, and the PR body counts them. Look before you ask: read docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md and search docs/ before registering or reopening anything.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), each row handled is resolved in stopgaps.json with a one-line resolution and its marker gone, the engine's own tests pass (credit.test.ts, staff.test.ts, budgets.test.ts, legislature.test.ts, macro tests) and so do the tripwire tests.

**Files.** src/core2/modules/credit.ts, src/core2/modules/business.ts, src/core2/modules/staff.ts, src/core2/modules/budgets.ts, src/core2/modules/legislature.ts, src/core2/modules/macro.ts, src/core2/data/stopgaps.json

**Notes.** Replaces the government and economy share of PR #4146 that is not elections, housing, jobs or law reach. About 21 rows were open on Oct 19.
