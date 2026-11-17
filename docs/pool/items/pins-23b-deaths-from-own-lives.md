---
id: pins-23b-deaths-from-own-lives
title: "Deaths come from one hazard curve and the people's own records, with no world factor or state ratio"
area: world
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: lives
pr: 9920
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: none
source: The CTO's LIFT THE PINS line on the crew's thread (#9747, comment 6936897718), family 23, pins 6, 7 and the mortality row of 10, Nov 17, 2026
---

**What.** A full person's strain was the SSA 2023 hazard times a per-world mortality factor, and a counted person's chance of dying was the SSA cohort table times the state's NCHS ratio times the same factor. Two towns with the same people died at rates fixed by the published tables, not by their own illness, care, coverage and housing.

**Cause.** Found in code: `src/core2/modules/health.ts`, `segments` (the world's mortality factor on every strain); `src/core2/births-counted.ts`, the counted death chance (`cohortDeathChance` by birth year, `stateMortality.ratioByState`, the world factor); `src/core2/world-base-rates.ts` (the mortality row).

**Fix.** Both tiers start from the one period hazard curve (`periodDeathChance`, the table a full person's strain is built on); the factors that move it are the person's own conditions, housing, eviction and web factors. The mortality factor, the state ratio file, the cohort projection and the mortality spread row are deleted.

**Time box.** 2 hours, Sonnet medium.

**Rules.** No dice. One model, two tiers: the counted tier reads the same curve as a full person. Replace, never layer.

**Done when.**

- `src/core2/deaths-from-own-lives.test.ts` passes and fails on the old code (the mortality table row and the state ratio read).
- At a drawn place over a played year, counted deaths follow the hazard of each person's own age, housing and web factors (`counted-deaths-spread.test.ts` passes).

**Waits on.** Nothing.

**Files.** `src/core2/births-counted.ts`, `src/core2/modules/health.ts`, `src/core2/world-base-rates.ts`, `src/core2/data/parameters.json`, `src/core2/deaths-from-own-lives.test.ts`, `src/core2/counted-deaths-spread.test.ts`, `src/core2/realistic-not-real.test.ts`.

**Notes.** Nov 17 (Lives): rows 8 and 9 of family 23 (death cause, teen cannabis) and the rest of row 10 follow in their own pull requests.
