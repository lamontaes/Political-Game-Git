---
id: gov-counted-reads-retirement-claims
title: "Retirement claims read counted groups by age band and work"
area: gov
kind: stopgap
priority: 2
size: S
status: done
claimed-by:
pr: #4656
blocked-on:
source: "split from core-stopgap-counted-groups-faked-mechanic (SG-CORE-counted-person-views), Oct 15"
claimed-at:
---

**What.** `modules/retirement-claims.ts` walks every counted household record (near line 126) to open Social Security claims. Read the groups by head's age band and work, and each claim a group's count times the benefit under the law in force. Today the stand-in builds a person or household record with no past and no ties for every counted member the engine touches. A counted group is read with the same rule as a full person, times its count, so the engine's total must not change.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person times its count, and a filled-in person matches the group's records. Replace, never layer: the engine's use of the built record is deleted in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body) the retirement-claims engine's totals equal the old per-person totals by group record id, no call of the household view remains in the engine, and the engine's tests and the counted-groups test pass.

**Files.** src/core2/modules/retirement-claims.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts

**Notes.** Part of retiring SG-CORE-counted-person-views (src/core2/data/stopgaps.json). place-prices already reads the store's live households and counts directly. Candidacy reaches counted people only through campaigns.

Looked at 2026-10-16, not built: the done-when line cannot hold as written. `claimDateOf` in `retirement-claims.ts` decides each person's claim date from their own birth date, savings, living costs and a trait lean (`decisionLean(... "retirement.claim-age" ...)`), and `claim` sizes the award from their own reliability trait and covered months. Two people in one counted household differ in all of these. Reading a group by its head's age band and multiplying by its count therefore gives different claim dates and totals than the per-person read, so "totals equal the old per-person totals by group record id" would fail by design. The item needs a decision first: either claims are read per counted member from the column store without building a person record (same totals, no `residentPerson` call; the cost saved is the record build, not the loop), or the owner accepts group-level claims with a different, documented total. The first is a real S item; rewrite the What and Done when to say so before building.

Sent back 2026-10-16 from PR #4656 (branch claude/gov-counted-reads-retirement-claims): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
