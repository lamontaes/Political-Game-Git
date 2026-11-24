---
id: health-web-factor-mismatch-red-by-draw
title: "health-web test red on main by draw: a full person's death factor misses the web's by 0.0003 (Bayside, Wisconsin, seed e278a4ff7b6b5d53)"
area: people
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: haiku
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The health-web test is red on main by draw. src/core2/health-web.test.ts ('moves full people's hazards and counted deaths by age and income') failed on clean main (1f6096efa1, Oct 29 01:50 UTC) with HEALTH_WEB_SEED=e278a4ff7b6b5d53, Bayside, Wisconsin: 'expected 0.9091826820185239 to be close to 0.9088579189485213'. A full person's booked death factor differs from the factor the test computes from the shifted web month by 0.000325. Other seeds pass. Found by the laws session while gating the mortality family. Guards: the town's deaths in the paper by age and income, which this test keeps right.

**Cause.** Measured: the mismatch does not reproduce on main 97b13d43 (Nov 11). `HEALTH_WEB_SEED=e278a4ff7b6b5d53 npx vitest run src/core2/health-web.test.ts` (Bayside, Wisconsin) passes both tests, as this morning's re-run also found. A fresh draw, `HEALTH_WEB_SEED=cf-c-hw-1` (Frederiksted Southeast, U.S. Virgin Islands), fails for a different reason before any assertion: "The country tier holds counts that cannot be: US-VI: 44035.54 jobs for 43614.13 workers" (src/core2/modules/macro.ts line 476). That is macro-country-jobs-over-workers-mid-cycle-start, which stops territory draws in their first months and whose cause is written in. No death factor is booked from the wrong month, age or fifth on main.

**Fix.** Nothing to build for this item. The CTO drops it as done by main. A territory draw that stops on the country tier's check is macro-country-jobs-over-workers-mid-cycle-start's to fix. If the 0.0003 mismatch comes back on any seed, file a new item with the person id, the booked factor and the month row it was read from.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** The chain is the acceptance: the factor a person's hazard carries is the web month's factor for their own age and income fifth on the day the engine looked, by record id. One rule, all 56 places: the test keeps drawing its place and names the place and seed.

**Done when.** A second session runs the test src/core2/health-web.test.ts on HEALTH_WEB_SEED=e278a4ff7b6b5d53 and two fresh drawn places in states, named with their seeds, and it passes; the item is then dropped.

**Waits on.** Nothing.

**Files.** src/core2/health-web.ts, src/core2/health-web.test.ts, src/core2/modules/health.ts

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `HEALTH_WEB_SEED=e278a4ff7b6b5d53 npx vitest run src/core2/health-web.test.ts` (Bayside, Wisconsin): green. Fresh draw `HEALTH_WEB_SEED=67bdaa02eee90b5d`: green. Proposed for the CTO: drop as fixed on main.

Nov 11 (cause finder for Fable B): passed again on the item's seed. A fresh territory draw stopped on the country tier's jobs check, which is the macro item, not this one. I agree with dropping it as fixed on main.

Dropped Nov 13, 2026 (Account lead T33, CTO's Nov 12 drop rule): its own Fix section says "Nothing to build. The CTO drops the item as done by main." and its Cause says the fault does not reproduce on main. The reproduce-again advice in that Fix stays the way back: file a new item from the place and seed if it returns.
