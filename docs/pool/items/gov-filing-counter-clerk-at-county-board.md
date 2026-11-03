---
id: gov-filing-counter-clerk-at-county-board
title: "A town race filed with a county board of elections has no one at the counter (North Amityville, New York)"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In North Amityville, New York (3651396; test seed 96f34b32a90f7079, world seed 48ecdf8d2595a1bafbf052509fe6e2fa00f861fe559fbc7a97fa73f32b6b6d62) the player's local race (contest:seat:gus2025:184112:board:0:2025-11-04, family municipalOffice) files with 'County board of elections (counter: election commissioner)'. filingClerkFor returns null: localClerkFor('municipalOffice') finds no town clerk, and the county board's commissioner is no one in the records. So the counter has no clerk, the player files at an empty counter, and the director cannot cast the filing scene that tells the petition. Found by Words on Nov 2 (words-filing-petition-scene-not-staged-by-seed); filing-counter-petition.test.ts now skips such a counter.

**Rules.** One rule, all 56 places: who staffs the counter comes from the office the place files with (its records), never a state named in code. Estimate, never UNKNOWN: where the data names a board but not its staff, the board's staff is drawn with a per-world spread and marked as an estimate, as gov-state-election-office-holder did for state election chiefs. Wire to the world: the staff are paid on the county's payroll.

**Done when.** In three drawn places whose local races file with a county board of elections (named with seeds, North Amityville, New York among them), filingClerkFor names a living person for every local contest, the counter visit shows them, and the director stages the filing scene with them cast; filing-counter-petition.test.ts passes at seed 96f34b32a90f7079 on that place rather than skipping it.

**Files.** src/core2/modules/filing-clerk.ts, src/core2/modules/executive.ts, src/bench/filing-counter-petition.test.ts

**Notes.** Needs from others: none. Words will add the counter lines for an election commissioner if the title differs from a clerk's.

Lane 3, Nov 3: also Trucksville, Pennsylvania (4277656), test seed d17e9b4a9dc4455a (filing-walkthrough:0): the county board race contest:seat:gus2025:209387:board:0:2025-11-04 (countyOffice) gets no clerk from filingClerkFor (no county staff under a clerk title), so the director leaves the filing scene uncast (coverage reason role-unbound, clerk). filing-walkthrough.test.ts now files only races whose counter names someone until this item lands.
