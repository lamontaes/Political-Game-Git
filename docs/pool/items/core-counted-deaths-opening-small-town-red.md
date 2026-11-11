---
id: core-counted-deaths-opening-small-town-red
title: "counted-deaths-opening.test fails in a small town where 2 counted people died against 13.4 expected (Wiley Ford, West Virginia, seed 277237f6cee1bc958164636cebb4861256472194c83f59c9a78c759bc359320d); it passed on a rerun of the same seed"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: added with npm run pool -- add
claimed-at:
lead: speed
standard: 2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
---

**What.** The counted-deaths-opening test failed in a small town: Wiley Ford, West Virginia (seed 277237f6cee1bc958164636cebb4861256472194c83f59c9a78c759bc359320d) saw 2 counted people die where 13.4 were expected, and the test passed on a rerun of the same seed. A run that differs between two runs of one seed means something in the opening or the deaths pass is not seeded. This item finds that and fixes it. Guards: the town's death count on the Metrics tab, which differs between two runs of one seed (2 against 13.4 expected in Wiley Ford, West Virginia).

**Cause.** Needs cause. Looked at: the item's title only, which records that counted-deaths-opening.test failed with 2 counted people dead against 13.4 expected in Wiley Ford, West Virginia (seed 277237f6cee1bc958164636cebb4861256472194c83f59c9a78c759bc359320d) and passed on a rerun of the same seed, which points at something not seeded. Not read: src/core2/counted-deaths-opening.test.ts.

**Fix.** None until the cause is found.

**Time box.** 3 hours for a Sonnet session: rerun the test on that seed several times, find what differs between runs, and rewrite this item with Found in code or Measured.

**Rules.** No dice: deaths follow causes read from the records, and the same seed must give the same world on every run. One rule, all 56 places: the test and the fix hold for a drawn place, not for one named place.

**Done when.** Once the cause is found, a second session runs src/core2/counted-deaths-opening.test.ts on Wiley Ford, West Virginia (seed 277237f6cee1bc958164636cebb4861256472194c83f59c9a78c759bc359320d) and on three drawn places ten times each and sees the same result every time, with the counted deaths and the expected figure printed.

**Waits on.** Nothing.

**Files.** src/core2/counted-deaths-opening.test.ts

**Notes.** TODO Released from idle draft #5196 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-7xkkii` (2026-10-20). Cleared from the front matter and kept here.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_SEED=277237f6...320d npx vitest run src/core2/counted-deaths-opening.test.ts`: the test draws its own places, not Wiley Ford. Still red: Centennial, Wyoming (5613440): "4 died, 103.4 expected, at least 30.1 needed", and Whippoorwill, Oklahoma (4080675): "illnesses under way at the opening: expected 0 to be greater than 0". Fresh draw `GOLDEN_PATH_SEED=1955dd6301face7e`: red the same way (Centennial: 4 died, 103.4 expected; Grandview Lake, Indiana: illnesses under way 0). Still red.
