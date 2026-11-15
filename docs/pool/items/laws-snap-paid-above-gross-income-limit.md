---
id: laws-snap-paid-above-gross-income-limit
title: "The SNAP test fails a household paid under the limit because it reads income the day after the decision"
area: laws
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/project-thread-8fxsy5
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

**Cause.** Found in code: src/core2/law-reach/group-b-food-aid.test.ts, the `check` function in "the baseline benefit in a played year", read the households on the day after the monthly close (`dayAfterClose`), while `runFoodAid` (src/core2/law-reach/group-b-food-aid.ts) decides the benefit at the close on the 1st and holds it for the month, as the law does (a change in income takes effect at the next monthly review, 7 CFR 273.12(c)). Measured: Suncook, New Hampshire (3375140), world seed b32eba5976c2f177c3de4eca51acf5a7f6054ec70775a6c431857270316b8b0b: person_072837dbc07c5e35's one-person household had income $18,921.60 on 2025-03-31 and 2025-04-01 against a limit of $20,345, and $20,498.40 on 2025-04-02, when the test read it. The engine paid correctly; the test was wrong, and a drawn test made it red by draw.

**Fix.** The test reads the households on the close day, the income the decision read, and is pinned to Suncook on that seed instead of drawing. The player sees nothing new: SNAP on the household page was already paid by the law in force.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** No dice: eligibility follows the household's own income and the law in force, never a draw.

**Done when.** A second session runs src/core2/law-reach/group-b-food-aid.test.ts on main and sees the pinned Suncook test pass, with the place and seed in its title, and every paid household's income on the close day under the limit.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-food-aid.test.ts
