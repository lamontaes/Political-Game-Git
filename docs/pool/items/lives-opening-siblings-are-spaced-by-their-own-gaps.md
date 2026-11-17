---
id: lives-opening-siblings-are-spaced-by-their-own-gaps
title: "The opening spaces a family's children by a drawn gap above a pregnancy, not a fixed three years"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: lives
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: none
source: The CTO's line on the crew's thread (#9747, comment 6958274786, Nov 17), from the playtest Fixer on #9995: no two siblings born less than about two years apart in 24 drawn places
---

**What.** Every family the opening makes (an adult's siblings, the children of a kin household, a child's own children) spaced its children `kinInterbirthYears` (3) apart by year, with a random day in each year. The closest two siblings could be was about two years, and every family had the same spacing.
Seen: dev mode, an adult's People list, shows siblings born less than two years apart in some families.

**Cause.** Found in code: `src/core2/opening-kin.ts`, `buildOpeningKin` (the sibling dates `birthYear + (j - order) * interval`, the kin household children `firstYear ± i * interval` and the grandchildren `gfirst + (g - 1) * interval`).

**Fix.** The years between one child and the next are `gapYears`: never less than the next child's gestation (`renewalGestationDays`, conception cannot come before the birth), plus a wait drawn for that gap, so the mean stays `kinInterbirthYears`. Dates are placed from the anchor child's exact birth date, not from a whole year. The mother's age at each child and the parents' marriage age read the same cumulative gaps.

**Time box.** 2 hours, Sonnet medium.

**Rules.** No dice in play: this is seeded generation of who exists. One rule for all 56 places. Replace, never layer.

**Done when.**

- `src/core2/opening-kin-spacing.test.ts` passes at drawn places (it draws its place from all 56 and names it and its seed) and fails on the old code (closest siblings 2.41 years apart at seed a1).
- `opening-kin`, `opening-kin-cash`, `population`, `opening-personality` and `opening-partnership` tests pass.
- A second session opens dev mode at a drawn place and sees an adult with siblings born less than two years apart, and none closer than a pregnancy.

**Waits on.** Nothing.

**Files.** `src/core2/opening-kin.ts`, `src/core2/opening-kin-spacing.test.ts`.

**Notes.** Nov 17 (Lives): `kinInterbirthYears` stays TUNABLE (the mean gap); an NSFG interpregnancy source would turn it into a distribution with a sourced shape.
