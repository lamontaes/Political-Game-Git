---
id: core-year-crash-standing-obligation-end
title: 'A played year stops: "Only a current standing obligation can end" (Waterford, California)'
area: core
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/core-year-crash-standing-obligation-end
pr: #4668
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at: 2026-10-16T15:57:52.933Z
---

**What.** A two-level bench world in Waterford, California (the first place drawn for `dialogue:coverage --seed batch-10-r2`) throws "Only a current standing obligation can end." partway through its year, from `endStandingContract` in `src/core2/finance-state.ts`. Something ends a lease or standing bill that was already ended or is not a standing obligation (a recipient income or a sales budget). Find it by record id and fix the caller.

**Rules.** One rule, all 56 places: the fix reads data for every place, and the repro place is only a repro. Speed: a town's game year stays under two minutes. Ask why: the failing record is named in the fix.

**Done when.** In the repro place and a second drawn place (names and seeds in the PR body) a one-year run of the played world (buildBenchWorld) finishes with no throw, shown by the final date, and the finance state test passes. Reproduce first: run the repro on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/finance-state.ts, src/core2/modules/housing.ts

**Notes.** From the Words session's notes (Oct 14).

Sent back 2026-10-16 from PR #4668 (branch claude/core-year-crash-standing-obligation-end): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
