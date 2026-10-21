---
id: jobs-raise-unfilled-pay-read-only
title: "An employer raising pay on an unfilled opening stopped the game: the review edits a read-only row"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/jobs-raise-readonly
pr: #4967
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T20:05:18.562Z
---

**What.** `raiseUnfilledPay` (`src/core2/modules/jobs.ts`) edited the opening rows the employer's review handed it with `Object.assign`, but those are the table's own read-only records, so the game stopped with "Cannot assign to read only property 'id'" the first time an opening stood long enough to be raised. The raised row now replaces the opening in the review's list and in the table. The fix is the one in the draft #4893 (a sibling session, still a draft), taken here so the check stops crashing; #4893 can be closed when this merges.

**Rules.** Wire to the world: the raised pay is what the employer's later review reads. No dice: the raise follows the employer's books, as before.

**Done when.** `src/core2/unfilled-opening-pay.test.ts` passes the step a read-only record, as the review does, and fails on main with the read-only error; in the played world (`buildBenchWorld`, drawn places) the golden-path check no longer stops in `raiseUnfilledPay`: it did in 5 of 38 places on Oct 17 (seeds sw302f2020, sw7cd1cb87, sw81d2d5bb, sw0b0eff9b and a fifth), and the seed sw0b0eff9b runs on.

**Files.** src/core2/modules/jobs.ts, src/core2/unfilled-opening-pay.test.ts

**Notes.** Found by the path-check sweeps. The draft #4893 has the same diff, opened at 08:40 and not marked ready.
