---
id: world-counted-reads-six-engines
title: "Jobs, unemployment claims, employer taxes, credit, business and candidacy read counted people from their group's columns"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5080
blocked-on:
source: split from world-counted-reads-person-callers
claimed-at:
---

**What.** Six engines built a full person record from a counted group's packed columns just to read a place, a birth date, a job, cash or traits. Those are jobs, unemployment claims, employer taxes, credit, business owners and founders, and a counted voter's reasons for running. Each now reads the counted person's facts from the group's columns (`residentFacts`, and a cached `factsOfHousehold` for credit), so none of them calls `residentPerson(` or `.peopleOf(`. The remaining callers (estates, the fill-in placeholder in state.ts and the counted-groups view) stay with world-counted-reads-person-callers.

**Rules.** One model, two tiers: a counted person is read with the same rule as a full person, from the same facts their group holds. Replace, never layer: each `residentPerson` call is deleted as its caller moves.

**Done when.** `grep -n "residentPerson(\|peopleOf(" ` over jobs.ts, jobs-benefits.ts, employer-taxes.ts, credit.ts, business.ts and candidacy.ts finds nothing, and a one-year buildBenchWorld run in a drawn place gives the same jobs, employer taxes, loans and cash journal totals as main on the same seed, with the place and seed named in the PR body.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-benefits.ts, src/core2/modules/employer-taxes.ts, src/core2/modules/credit.ts, src/core2/modules/business.ts, src/core2/modules/candidacy.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts, src/core2/counted-facts-year.test.ts

**Notes.** Built on PR #5080, branch claude/political-game-pool-8defjq.

Sent back 2026-10-23 from PR #5080 (branch claude/political-game-pool-8defjq): Fresh main integration conflicts in code at src/core2/modules/employer-taxes.ts:22; preserve both current tax readers and residentFacts, then rerun the scoped checks and annual equality proof; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5080 (branch claude/political-game-pool-8defjq): PR introduces duplicated What/Rules/Done-when/Files/Notes blocks in release-red-vote-level-organizing-filed.md and duplicate Notes headings in release-red-electorate-weight.md; keep one current spec, preserve Notes, merge main and regenerate INDEX; finish on that branch, merge main into it first.
