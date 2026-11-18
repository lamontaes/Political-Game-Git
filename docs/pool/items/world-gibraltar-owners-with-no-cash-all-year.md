---
id: world-gibraltar-owners-with-no-cash-all-year
title: "About fifty owners in a town of 615 hold almost no cash all year"
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

**What.** In Gibraltar, Michigan (seed pt8:0, first played year) about 40 to 55 of 615 owners without a mortgage hold less cash than one twelfth of their annual property tax, in January and still in December. They fall behind on every installment. Seen: on the town's Money screen in the first played year, and in a year-1 run at three places.

**Cause.** Measured: place Gibraltar, Michigan, seed pt8:0, one played year from the game start (scratch probe: advance 365 days, read each owner's members' liquidMinor). Median cash among the same owners goes from 9.4 thousand dollars in January to 97 thousand in December, so the whole group is not poor; a fixed tail is. The count of owners below a twelfth of their annual tax is 55 in January, 50 in February, 48 in March and 40 to 43 in the months after. Arrears rows hold at 45 to 63 with and without due dates, so due-date billing only makes each lump larger. Not yet read: what these households earn and spend, or whether their opening cash is simply low. Related work: #9117 (renters buy homes; that thread is setting opening cash by age) and #9104 (home prices); read both before building so this does not become a second line of work on opening cash.

**Fix.** Design: Read the ~50 households' income, spending and opening cash against the town's records, say which of the three is low, and fix it in the engine that owns it (opening cash by age if #9117 covers it, household spending or income otherwise). Prove it by the same count at three places, year 1, with and without.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Estimate, never unknown; no dice (traits, money and the law decide, not a roll); one rule, all 56 places; the fix goes in the engine that owns the mechanic and replaces, never layers. Check #9117 and #9104 first.

**Done when.** A second session, not the builder, replays it on main in a drawn place and seed it names: a one-year played world (buildBenchWorld) shows the count or the median path inside the stated bound, with the record ids of the households read, and the Money screen shows the owners' cash.

**Waits on.** Nothing; read #9117 and #9104 first.

**Files.** src/core2/modules/residents.ts; src/core2/modules/housing.ts; src/core2/data/housing/parameters.json

**Notes.** Found by the stopgap cluster 15 due-date probe (PR #9189). Same run with and without due dates.
