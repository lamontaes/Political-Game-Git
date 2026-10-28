---
id: business-never-adds-location
title: "No business ever opens a second location, and town foundings swing from 3 to 1 to 7 a year"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Cochituate, Massachusetts (key 2514570, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc), three played years held 11 foundings and none was a location of an existing business (no founding row names a parent). Openings per year were 3, 1 and 7 against the state's BDS entry range of 8.4% to 11.0% of 30 to 40 businesses. Roadmap M1-08's check fails on both. The founding decision is in business.ts foundings/found; why parents never expand is not yet known.

**Rules.** No dice: a business adds a location because its own books, market room and owner decide it, never a yearly chance; real BDS rates check the totals only.

**Done when.** node --max-old-space-size=8192 --import tsx src/core2/tooling/m1-08-check.ts in Cochituate, Massachusetts (seed above) shows at least one location founding with its parent, market room and cash by record id, and openings inside the BDS range, with the cause of the missing expansions named in the PR body. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** src/core2/modules/business.ts

**Notes.** TODO
Diagnosis (claude pool worker, Oct 27; released unbuilt, M-size with a calibration). Reproduced with `GOLDEN_PATH_SEED=93a558a5… GOLDEN_PATH_PLACE_KEY=2514570 node --import tsx src/core2/tooling/m1-08-check.ts` in Cochituate, Massachusetts on main: three years, "no business added a location in 3 years", and the openings are now too many, not too few (10 of 30 = 33.3%, 12 of 51 = 23.5%, 12 of 62 = 19.4% against the recorded entry range 8.4 to 11.0%; closings 1, 1 and 2 against 7.4 to 9.5%). I logged `foundings` (src/core2/modules/business.ts about line 1649) for 14 months of the same world. Why no location: (1) every market's `room` (demand over capacity less one, `marketRoom`) is exactly 0.0000 in all 43 markets on 2025-02-01 and in every market thereafter, so `expandOption`'s room term is `businessFoundRoomWeight (6) * (room * incumbents - 1)` = -6 and the score, -3 (businessExpandBaseline) - 6 + 3 * strength (at most +3), can never beat keeping the business. The owners' decisions all say business-owner-keep (36 of 36 on 2025-02-01 with strength 0.05 to 0.96). (2) From April on, the month's loop never reaches an expansion at all: `foundings` sorts the markets by score and `return`s on the first founding ("a founding returns out of this function"), and a counted founder (the wider-population branch, `strongestPulls(api, "found", rows)`) founds a business in the top market EVERY month. In this world that market is manufacturing: its incumbents grow 2, 3, 4, ... 13 from April 2025 to March 2026 with room 0.0000 throughout (the DBGEXP/DBGMKT logs), so manufacturing absorbs the one founding a month and no other market is evaluated. That one-a-month is also where the 12 openings a year (the entry rate over the BDS range) come from. What a fix needs, in order: the counted founding must weigh room as the full-person branch does (`businessCountedFoundBaseline` and the unemployed and prospect terms carry a candidate with no gap in the market; calibrate against BDS entry through the baseline, TUNABLE, not a cap), the founding loop must not let one market take every month (a founding in one market should not end the evaluation of the others, or the market should be chosen after the founder), and expansion needs markets whose demand grows past capacity (population and income growth) or a different expansion cause, since in a steady town room is 0 and an owner has no unmet demand to expand into. Not a one-line fix; wants the business lead's design pass. No code change kept.
