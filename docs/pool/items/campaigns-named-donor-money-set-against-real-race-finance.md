---
id: campaigns-named-donor-money-set-against-real-race-finance
title: "Named-donor money raised per race is set against real campaign finance for races of that size"
area: elections
kind: research
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: "CTO and coordinator, Nov 14, 2026, after the donor-month fix (PR 9166)"
model: sonnet
effort: medium
root: none
checked: fable 2026-11-14
---

**What.** After donors stopped giving past their month's means (PR 9166), the money a played year raises from named donors is still far above what races of that size raise in real life, or it may now be below it for some. Nobody has set it against real figures, so the next builder does not know which way it is off. Seen: the totals per race on a candidate's Campaign tab and in the news about money raised.

**Cause.** Measured: named-donor gifts in year 1 from the opening (`scripts/core2-year/donor-month-proof.ts <seed> <placeKey> 365`), before then after the fix. Williamstown KY (survey-b) $390,135 then $226,341 across 17 races: U.S. Senate $52,343, U.S. House $54,202, state House $35,923, sheriff $10,055, county board seats $2,444 to $18,726, executive $372, coroner $1,625, clerk $2,925, treasurer $9,441, assessor $7,511. McKenney VA (survey-a) $319,540 then $275,950 across 8 races: governor $53,282, attorney general $80,323, House of Delegates $57,225, lieutenant governor $38,978, council and mayor races $6,857 to $23,708. Stanford IN (survey-c) $378,458 then $276,350 across 20 races. No one has compared these with campaign finance reports for town and county offices, so the size of the error and its direction are unknown.

**Fix.** The earlier calibration (campaign-money-from-local-finance) fixed the per-gift median and the call-time bands only. Read real campaign finance reports for town, county and small state races of a similar size (state and county election office filings, and published summaries such as the National Institute on Money in Politics) and set the three places' per-race totals against them. Real figures check the totals; they never decide one donor's gift. Write the comparison, name which way the game is off, and file the tuning of `donationShareOfMonthPerWarmth`, `donationMonthScaleMonths` and the cash share as a separate item with the spread it should be checked against.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what is written and stop.

**Rules.** Research before building: real data calibrates the totals and never decides one donor's gift. Estimate, never UNKNOWN: every figure compared carries its source and spread. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. No place is named in logic.

**Done when.** A second session, not the builder, runs `scripts/core2-year/donor-month-proof.ts` on main in a drawn place nobody chose (named, with its seed), and sees each race's named-donor total beside the document's real figures for a race of that size, with the document saying which way the game is off and any tuning filed as its own item.

**Waits on.** Nothing.

**Files.** docs/design (new), src/core2/data/campaigns/parameters.json, src/core2/campaign-money-calibration.test.ts
