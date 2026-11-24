---
id: press-layoff-counts-the-jobs-lost
title: "A layoff's story scores by the jobs it cut, not only by the owner it names"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: press-campaign-gifts-take-the-races-level
blocked-on:
lead: words
source: "the gift-crowding cause-finder, Nov 14, 2026, on the Account lead's order"
model: sonnet
effort: medium
root: none
checked: sonnet 2026-11-14
---

**What.** With campaign gifts out of the way, the six layoffs at Williamstown, Kentucky (seed survey-b, Nov 2025 to Jan 2026) still print none. A layoff names one owner, so it scores about 1.35 at the town's desk, below the median of 1.56 to 2.49 that the week's printed stories scored, so a law or a vote always takes the slot. Seen: the town paper prints a story when a business in town cuts its staff, naming the business and how many jobs went.

**Cause.** Measured: Williamstown, Kentucky, seed survey-b, one year from the start date; layoffs on 2025-11-01, 2025-12-01 and 2026-01-01, none printed, while Shackle Island, Tennessee (seed gift-d), with more reporters, prints 18 in the same window. Found in code: `involved` in src/core2/press-desk.ts returns 0 for a `business.staff-reduced` record, so its people term is only the named owner; its facts carry `jobsLost` and `staffAfter` (src/core2/modules/jobs.ts, the `business.staff-reduced` emit).

**Fix.** In `involved`, a staff reduction involves the town's followers who held the cut jobs plus the counted followers in the same share, by `jobsLost`, as a law in force reaches the people it binds; read the jobs from the record's `jobChangeIds`, not a new table.

**Time box.** 3 hours for one Sonnet session.

**Rules.** No dice. It changes what an unattended world prints: give year 1 and time per record at three places, with and without.

**Done when.** A second session, not the builder, plays a year in a drawn place, Williamstown, Kentucky (seed survey-b), in a played world and finds a story for each layoff that cut jobs in the weeks after filings open, naming how many jobs went, or the reason one did not.

**Waits on.** press-campaign-gifts-take-the-races-level.

**Files.** src/core2/press-desk.ts, src/core2/modules/jobs.ts
