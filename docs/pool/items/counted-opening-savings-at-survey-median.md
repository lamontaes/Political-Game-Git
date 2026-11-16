---
id: counted-opening-savings-at-survey-median
title: "A counted household opens at its survey median times its own savings draw, so the median household holds the median"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: T54
pr: "#9657"
after: counted-savings-banked-by-group
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "T54's #9117 trace at Staples CT, Nov 15 23:20Z (fault B); Account lead's rulings 23:36Z (its own PR, set in the one place opening cash is set, no second weight) and 00:30Z (each counted household opens at its survey median times its own draw, the one draw savingWeight already keeps)"
---

**What.** At Staples CT (`drawPlace("probe-a", "exit-a")`, 1,500 people) the median counted household held 0.56 of its survey median in cash and savings on day 1, with group-held savings (#9597). Since #9117 a counted household's days of money decide whether it starts looking for work, so 57 counted people started looking on day 2 for want of money they would really have (0 before #9117). Seen: the jobless count on day 2 and in dev mode a counted household's cash beside its survey median.

**Cause.** Found in code: every household's opening cash (`population.ts` for full and counted households, `householdOpeningCash` in src/core2/starting-cash.ts for kin and the county sample) was its survey median with no spread, the collapse (`collapseToTwoLevels`, src/core2/residents.ts) put those medians in each group's account, and `householdCash` then shares the account by savings weights `exp(σz − σ²/2)`, whose mean is one but whose median is `exp(−σ²/2)`, 0.38 at σ 1.39. So the median household held well under its median.

**Fix.** Where opening cash is set, every household (full, counted, kin and county sample) opens at its survey median times its own draw, `householdBalanceDraw` = `exp(σz)` keyed by the household's id (src/core2/household-balance-draw.ts), and `savingWeight` (src/core2/counted-money.ts) reads the same z. The collapse is unchanged and keeps every dollar; the group's account holds what its households hold, and each household's share is its own median times its draw, so the median household holds its median. No second weight. Account lead's ruling, Nov 16: the draw sits where opening cash is set, keyed by household id, with no re-pin of residents.test.

**Time box.** 3 hours, Opus, medium.

**Rules.** One model, two tiers: the opening draw is the one `savingWeight` reads. Estimate, never unknown: the survey median stays the source. No tuned weights.

**Done when.** At Staples on day 1 the median counted household holds between 0.85 and 1.2 of its survey median in cash and savings (`counted-opening-savings-median.test.ts`, 0.56 before), the day-2 jobless count falls back toward the count before #9117, and a year at three places runs no slower than 20% over the Train. A second session sees in dev mode, at a drawn place it names with its seed, counted households holding about their survey median on day 1.

**Waits on.** #9597 (counted-savings-banked-by-group).

**Files.** src/core2/household-balance-draw.ts (new), src/core2/population.ts, src/core2/starting-cash.ts, src/core2/opening-county-sample.ts, src/core2/modules/residents.ts, src/core2/counted-money.ts, src/core2/opening-kin-cash.test.ts, src/core2/housing-counted-buy.test.ts, src/core2/counted-opening-savings-median.test.ts (new), src/bench/dev-why.ts, src/bench/dev-why-counted-money.test.ts (new). Dev mode: the trace of a counted household or person shows its Money and Looking for work panels, and the trace of a person shows its household's Opening savings draw.
