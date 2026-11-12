---
id: core-counted-deaths-opening-small-town-red
title: "counted-deaths-opening.test fails in a small town where 2 counted people died against 13.4 expected (Wiley Ford, West Virginia, seed 277237f6cee1bc958164636cebb4861256472194c83f59c9a78c759bc359320d); it passed on a rerun of the same seed"
area: core
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/pool-core-counted-deaths-opening-small-town-red
pr: #8804
after:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T10:41:40.648Z
lead: speed
standard: 2
model: opus
effort: high
root: none
checked: fable 2026-11-10
branch: claude/pool-core-counted-deaths-opening-small-town-red
---

**What.** The counted-deaths-opening test failed in a small town: Wiley Ford, West Virginia (seed 277237f6cee1bc958164636cebb4861256472194c83f59c9a78c759bc359320d) saw 2 counted people die where 13.4 were expected, and the test passed on a rerun of the same seed. A run that differs between two runs of one seed means something in the opening or the deaths pass is not seeded. This item finds that and fixes it.

**Cause.** Found in code: src/core2/births-counted.ts books a counted illness (and so a counted death) only a whole record at a time. Expected deaths are summed as each person's chance times the people their record stands for (line 704), and the pass books the next person only once what is owed reaches that record's weight (line 740, `owedNow >= weightOfPerson(members[0])`). Where records are heavy, nothing is booked for months, and then a whole record dies at once. Measured on main (Nov 11), the test's own Centennial world (Wyoming, 5613440, seed 140bb7872bc46f5202d12ae8c4c52ca2364da2da170593f43aeb7f7810bd5366, bookkeeping on, 125 days): 2,061 counted records weighing 1 to 107 (median 1); the counts expected 103.4 deaths, almost all in the wider place jurisdiction_123e40cf8eefd8aa (about 23 a month), where none died; 4 died in all (4.0 weighted), 2 illnesses booked at the opening. So the test's floor (half of 103.4, less three sigma) cannot be met, and in a place whose owed share never reaches one record's weight before the opening, no illness under way is booked (the Nov 11 re-run's Whippoorwill, Oklahoma). This is not a seeding fault: the Oct 24 Centennial had 11.6 expected because its records then stood for one person each. The same heavy records drive core-memory-arcadia-medical-bills-and-loans-grow.

**Fix.** In src/core2/births-counted.ts, let the deaths pass book a part of a heavy record: when what is owed is less than the next record's weight, book the owed part as deaths of that many of the people the record stands for (count it in `deathCauses` and `carry.died`, and lower the record's weight by it through a store method in src/core2/counted-groups.ts, `setWeight`, the one core-memory-arcadia-medical-bills-and-loans-grow also adds; build it once, whichever lands first), keeping whole-record deaths for records the owed amount covers. Do the same for the illnesses under way at the opening. Then make src/core2/counted-deaths-opening.test.ts compare weighted deaths (the sum of each row's `deathCauses`) with the expected, and count the illnesses under way by weight. One model, two tiers: a counted record dies by the same rule as a person, times its weight.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: deaths follow causes read from the records, and the same seed must give the same world on every run. One rule, all 56 places: the test and the fix hold for a drawn place, not for one named place.

**Done when.** Once the cause is found, a second session runs src/core2/counted-deaths-opening.test.ts on Wiley Ford, West Virginia (seed 277237f6cee1bc958164636cebb4861256472194c83f59c9a78c759bc359320d) and on three drawn places ten times each and sees the same result every time, with the counted deaths and the expected figure printed.

**Waits on.** Nothing.

**Files.** src/core2/births-counted.ts, src/core2/counted-groups.ts, src/core2/counted-deaths-opening.test.ts

**Notes.** TODO Released from idle draft #5196 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-7xkkii` (2026-10-20). Cleared from the front matter and kept here.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_SEED=277237f6...320d npx vitest run src/core2/counted-deaths-opening.test.ts`: the test draws its own places, not Wiley Ford. Still red: Centennial, Wyoming (5613440): "4 died, 103.4 expected, at least 30.1 needed", and Whippoorwill, Oklahoma (4080675): "illnesses under way at the opening: expected 0 to be greater than 0". Fresh draw `GOLDEN_PATH_SEED=1955dd6301face7e`: red the same way (Centennial: 4 died, 103.4 expected; Grandview Lake, Indiana: illnesses under way 0). Still red.

Cause found (Nov 11, 2026, cause finder for Fable B): a probe built the test's Centennial world and read the counts rows and the records' weights; the heavy records of the wider place carry nearly all the expected deaths and can only die a whole record at a time.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 10:41 UTC) on branch claude/pool-core-counted-deaths-opening-small-town-red.
