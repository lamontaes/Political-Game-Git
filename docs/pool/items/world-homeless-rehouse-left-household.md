---
id: world-homeless-rehouse-left-household
title: "A year stops in Monarch, Montana (seed 29941afd): a homeless household rehouses with no living member in it"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #5772
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A played year stops on 2026-02-06 in Monarch, Montana with Finance terms require distinct recorded payers. The housing module's monthly review of homeless households rehouses one whose status row still lists a living member who has since left the household, while the household itself holds only a dead member, so the lease has no payers. It was found running the candidacy calibration test in a drawn place and reproduces from the same place and seed.

**Rules.** Wire to the world: the fix is proven in a played year of the place that stopped and of a drawn place. One rule, all 56 places: nothing names the place. No dice: the rehousing follows who is alive and in the household.

**Done when.** A test beside housing-homeless.test.ts plays 400 days in buildBenchWorld in the place and seed that stopped and in a drawn place, with the place and seed named in every failure message, and every open lease has at least one living payer by contract id.

**Files.** src/core2/housing-homeless.ts, src/core2/housing-rehouse-left-household.test.ts

**Notes.** TODO
