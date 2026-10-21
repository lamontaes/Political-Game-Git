---
id: succession-unchosen-nominees-not-seats
title: "The nominees a president passed over are not seats left empty"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/unchosen-nominees-s5
pr: #4866
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T04:13:13.390Z
---

**What.** The 56-place year check (`scripts/core2-year/all-places.mjs`, oct17main run, Millersburg, Pennsylvania, seed 26ae22cd0efa) fails its seats-filled check: `seat:vice-president:2025-09-15:0:1 roster empty since 2025-09-15` (and `:0:2`). The president died on September 15, 2025, the vice president succeeded, and the new vice president was nominated and confirmed from a field of three (`nominate` in `src/core2/modules/succession.ts`). The two passed over are kept as rows in the officials roster with `ended` set the same day, and the check reads each such row's seat as one emptied and never filled. They were never seats. Mark them as never seated and have the check skip them.

**Rules.** Ask why: the passed-over nominees stay on the record (the choice's reasons name them). No dice.

**Done when.** After a vice-presidential vacancy in a one-year run of the played world (Millersburg, Pennsylvania, seed 26ae22cd0efa reproduces it), the roster holds the three nominees with the two not chosen marked never seated, and the all-places seats check passes. A test in `src/core2/succession.test.ts` states the marking.

**Files.** src/core2/modules/succession.ts, src/core2/modules/officials.ts, scripts/core2-year/all-places-worker.ts, src/core2/succession.test.ts

**Notes.** Found by the oct17main 56-place run on main (55 of 56 places pass all four checks).
