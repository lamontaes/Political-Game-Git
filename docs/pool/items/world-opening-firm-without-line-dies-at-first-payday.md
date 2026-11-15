---
id: world-opening-firm-without-line-dies-at-first-payday
title: "A firm that opens with a small cash buffer closes at its first payday: no credit line exists until the first monthly review"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: sonnet
effort: medium
root: day-one-in-motion
source: traced by the Account lead from the read-only stores/health tracer, Nov 15
claimed-at:
---

**What.** Danville, Pennsylvania opens with Moody Family Clinic (132 staff), which closes on Jan 30, ten days in, with "cash and credit exhausted", and the county's health care goes with it. No business in either town holds a credit line on the first day. Seen: the clinic holds $17,383 against a first payday of $229,076.

**Cause.** Measured: Danville, Pennsylvania (place 4218136, seed ilt-danville), Train head 29ef4685. The clinic's opening cash is 0.40 buffer days of planned outflow (hash quantile 0.007 on the observed buffer curve: q25 14, median 30, q75 67 days, low end 0), and all 132 staff are in the planned payroll, so the estimate is not a miscount. Its first payday for 127 counted staff is Jan 30. No firm holds a credit line on day 0; the credit review does run on the first day (`onDay`), but each firm's manager chooses between "do without" and "borrow" and the clinic's manager does without (borrow scores +0.92, do-without wins), so no line exists when the payday falls and the next review is a month off. A firm that has been running would already hold the line it needed.

**Fix.** At the opening, run the existing credit review with the firms' own choice already made: every firm whose cash is under its cover holds the line the same limit formula gives (cover, appetite, record). One flag on the existing step (`review(api, true)` on the first day); no second engine, no floor on buffer days, no moved draw.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** No dice: the line comes from the firm's payroll, cash and record, never a roll. Day one is in motion: a running firm opens with the line it needed, from the engine that makes lines. Unattended-world timing at three places, with and without, twice each side. One rule for all 56 places.

**Done when.** A second session builds a drawn place with a seed it names, and Danville (place 4218136, seed ilt-danville) through buildBenchWorld in a played world, sees the clinic hold a line on day 1 and meet its first payday, sees how many firms in the world open under their first payday before and after, and sees no new closure in the first 60 days with no law passed.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, src/core2/modules/credit-opening-lines.test.ts

**Notes.** The clinic still closes later (about Feb 27 at Danville) because its sales are about 30 percent of planned demand (bills go to one other seller); that is the next item in the trace, not this one.
