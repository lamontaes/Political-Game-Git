---
id: world-median-owner-cash-grows-tenfold-in-a-year
title: "Median owner cash grows about ten times in the first played year"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "stopgap cluster 15 due-date probe, Gibraltar MI seed pt8:0, Nov 14"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc9-place-facts-one-default
checked: sonnet 2026-11-14
---

**What.** In Gibraltar, Michigan (seed pt8:0) the median cash of owners without a mortgage goes from 9.4 thousand dollars on Jan 20 to 12.3 thousand in February, 27 thousand in April, 61 thousand in August and 97 thousand in December of the first year. Incomes should not outrun spending that far. Seen: on the town's Money screen in the first played year, and in a year-1 run at three places.

**Cause.** Measured: place Gibraltar, Michigan, seed pt8:0, one played year from the game start (scratch probe: advance 365 days, read each owner's members' liquidMinor). Measured: the same run with and without due-date billing shows the same climb (9.4 to 96.9 thousand), so property tax billing is not the cause. One year with no net outflow beyond bills means households save nearly all of what they earn, or income is overstated, or spending reads too few categories. Not yet read which. Related work: #9117 (renters buy homes; that thread is setting opening cash by age) and #9104 (home prices); read both before building so this does not become a second line of work on opening cash.

**Fix.** Design: Read household income and spending for the median owner month by month in the engine that owns them (money-economy skill), find the leak or the overstated inflow, fix it at the root, and show the median cash path over three years at three places staying inside a believable savings rate.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Estimate, never unknown; no dice (traits, money and the law decide, not a roll); one rule, all 56 places; the fix goes in the engine that owns the mechanic and replaces, never layers. Check #9117 and #9104 first.

**Done when.** A second session, not the builder, replays it on main in a drawn place and seed it names: a one-year played world (buildBenchWorld) shows the count or the median path inside the stated bound, with the record ids of the households read, and the Money screen shows the owners' cash.

**Waits on.** Nothing; read #9117 and #9104 first.

**Files.** src/core2/modules/residents.ts; src/core2/modules/housing.ts; src/core2/data/housing/parameters.json

**Notes.** Found by the stopgap cluster 15 due-date probe (PR #9189). Same run with and without due dates.
