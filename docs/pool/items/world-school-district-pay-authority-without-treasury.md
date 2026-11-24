---
id: world-school-district-pay-authority-without-treasury
title: "A drawn school district's pay authority has no treasury funding it, so its teachers' pay comes from nowhere"
area: world
lead: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/school-pay-treasury
pr: #6280
blocked-on:
source: laws lead, Oct 26
claimed-at: 2026-10-27T09:37:18.997Z
---

**What.** `src/core2/school-pay.test.ts` fails on clean main (040b9796b3) with `GOLDEN_PATH_SEED=c04e187bb54f8800c54726f409fe32f13c27e00c`: "opening-public-pay:85edd023d00d06ab is funded by a treasury: expected undefined to be defined". The district the test drew has full teachers on its pay authority, but `publicPayTreasuries` finds no treasury for that authority. The counted case on the same seed passes. Whether the world builds this district under a government with no treasury, or links the authority to the wrong government, is not traced. The schools budget line pays teachers through this link, so a district without it is a district whose line pays no one.

**Rules.** One rule, all 56 places: every public pay authority the world opens with is funded by the treasury of the government it belongs to. The test may redraw only for a reason read from the district's records, naming each district it passed over.

**Done when.** `src/core2/school-pay.test.ts` passes on `GOLDEN_PATH_SEED=c04e187bb54f8800c54726f409fe32f13c27e00c` and on two fresh random seeds named in the PR body, and the PR names the place, the district and why its authority had no treasury, by record id.

**Files.** src/core2/school-pay.test.ts, src/core2/budgets-treasury.ts

**Notes.** Laws lead, Oct 26: found in the health and schools family's gate (PR #6026) and confirmed on clean main.
