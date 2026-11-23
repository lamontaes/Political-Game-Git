---
id: laws-snap-paid-above-gross-income-limit
title: "SNAP pays a household whose gross income is over 130 percent of the poverty line"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Laws thread, Nov 15, 2026, gating the amendment-terms fix beside the food aid tests
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** In a played year a named household is paid SNAP although its gross income is over the program's limit of 130 percent of the poverty line. The federal treasury pays a benefit the law does not allow. Seen: the household's benefit on its household page and dev mode's reach for the SNAP maximum list a household that should not qualify.

**Cause.** Needs cause. Measured: src/core2/law-reach/group-b-food-aid.test.ts, "pays qualifying households from the federal treasury", with FOOD_AID_SEED=443fee378a0d75b94561177628e461d3f243a42341d2a212029e60acfd695baa draws place 3375140 on seed b32eba5976c2f177c3de4eca51acf5a7f6054ec70775a6c431857270316b8b0b, and person_072837dbc07c5e35 is paid with gross income 20498.4 against a limit of 20346. Red the same way on the clean Train 29ef4685 and with the amendment-terms fix, so it is not that change. Where to look first: whether the benefit engine (`runFoodAid` in src/core2/law-reach/group-b-food-aid.ts) and the test read income over the same months and the same household.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** No dice: eligibility follows the household's own income and the law in force, never a draw.

**Done when.** A second session runs src/core2/law-reach/group-b-food-aid.test.ts with the named seed on main and sees it pass, with the drawn place and seed printed, and the paid households' incomes under the limit.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-food-aid.ts, src/core2/law-reach/group-b-food-aid.test.ts
