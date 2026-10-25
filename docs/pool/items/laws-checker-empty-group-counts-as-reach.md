---
id: laws-checker-empty-group-counts-as-reach
title: "The law matrix grades reach wired from a counted group that stands for no one"
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `reachLink` in `scripts/law-wiring/matrix.ts` counts any open applied record as reach, including a counted group whose count is 0. In the health-schools year run in Prescott, Michigan (seed a91c03e7d2b84f10), the school voucher's only record is a group of 0 people (no household there pays private tuition), and the matrix grades the voucher's reach and all-places links wired on it (found by the health-schools helper, Oct 25). A law that reached nobody then looks wired in that town.

**Rules.** An effect is a read: reach means a person, household, group of people or organization the law actually applied to, never an empty record.

**Done when.** `scripts/law-wiring/matrix.ts` ignores applied records whose count is 0 when grading reach and all-places, a unit test covers it, and the rebuilt matrix from the health-schools year runs in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) grades the voucher's reach from Uehling's records alone, naming Prescott as a place with no subject.

**Files.** scripts/law-wiring/matrix.ts

**Notes.** From the laws lead, Oct 25, on the health-schools helper's report.
