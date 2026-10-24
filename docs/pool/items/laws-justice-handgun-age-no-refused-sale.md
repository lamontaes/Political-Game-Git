---
id: laws-justice-handgun-age-no-refused-sale
title: "Handgun-age law refuses no sale in a small drawn town, failing the justice family test"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The justice family test fails on clean main in Skanee, Michigan (2674120), seed 1d3152b7aae80d2d9733320a04fa4fdad4b61fb6: with the handgun purchase age raised, no handgun sale is refused, so the law moves no money there ('refused sales: expected 0 to be greater than 0'). Sales before the limit do happen in the same run, so the town has buyers; the raised age either reaches nobody under it who would buy, or the refusal path posts nothing. The laws lead found it in its gate on Oct 24 and confirmed it on main with the same seed. Either the engine misses a refusal it should record, or the test needs a town where a buyer under the age exists.

**Rules.** No dice: whether a would-be buyer under the age is refused must come from the buyers the town holds and the law in force, never a roll; one rule, all 56 places: the fix may not skip a place, only draw again when the town has no buyer under the age, naming it.

**Done when.** src/core2/law-wiring-justice.test.ts passes on seed 1d3152b7aae80d2d9733320a04fa4fdad4b61fb6 and on two fresh random seeds, each named in the PR body; the PR says which it was (a refusal the engine missed, by file and line, or a town with no buyer under the age, redrawn with the reason named).

**Files.** src/core2/law-wiring-justice.test.ts

**Notes.** TODO
