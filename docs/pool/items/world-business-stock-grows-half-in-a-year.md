---
id: world-business-stock-grows-half-in-a-year
title: "A town's business stock grows by half in a played year and almost nothing closes"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: opus
effort: high
root: none
source: added with npm run pool -- add
---

**What.** In a played year a town opens with 29 to 32 businesses and ends it with 15 to 30 more, while 0 to 1 of the starting ones close. Census BDS has about 9 to 10 percent of establishments entering and 8 to 9 percent exiting in a year. Employers keep arriving without leaving, so the town's jobs and its openings stock follow the founding rule, not the town's demand. Seen: the Businesses list for a town on day one against the same town a year later. Seen: the town's Businesses list a year apart, with the new and closed ones named.

**Cause.** Measured: place 2572600 seed q7a, 32 businesses at day 0, 30 opened and 0 closed in 365 days (94 percent entry, 0 percent exit); place 4756560 seed z3b, 29 at day 0, 15 opened and 1 closed (52 and 3.4 percent); scratch run on the Nov 26 main with one world per place, bookkeeping off, so the counts are the books' own. The founding rule reads market room, demand over capacity less one (src/core2/modules/business.ts, the Market row near line 1914 and foundings near line 1949); realized receipts matched the books' demand (1.01 to 1.12 of it) at four places, so the room that draws founders is the opening's demand against its capacity, not a gap the town's sales show.

**Fix.** Read why each place has room at day 0 (the opening's capacity sizing against its demand, src/core2/opening-capital.ts and business-books.ts) and size the day-one stock from the engine that makes the flow, so a place opens already at the rate it holds, per the day-one-in-motion rule. Keep the founding rule itself: one engine. Prove it in a 24-month played world at three drawn places: entries and exits per year against the stock, and the out-of-work count.

**Time box.** 6 hours

**Rules.** No dice. Real rates check totals and never set one firm's outcome; the entry and exit rates come out of the simulation. One engine for founding; no second. Day one is in motion (skill day-one-in-motion).

**Done when.** A second session, at a drawn place and seed nobody chose, plays two years in dev mode and sees the business list's count change by no more than a fifth each year, with the openings and closings listed by record id and the reason each gave.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/opening-capital.ts, src/core2/business-books.ts
