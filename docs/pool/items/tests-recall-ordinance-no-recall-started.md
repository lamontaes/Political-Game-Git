---
id: tests-recall-ordinance-no-recall-started
title: "recalls.test: with seed recall-proof-2 no recall starts in any of nine drawn places"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The test an ordinance can start a recall where the law allows one, and none where it doesn't fails for some seeds because no recall starts in any of the places it draws. With GOLDEN_PATH_SEED=recall-proof-2 it tried US-UT 4923200, US-NY 3659564, US-WA 5330060, US-IN 1869516, US-NC 3775060, US-IA 1966540, US-MN 2754808, US-CA 0631708 and US-RI 4474300 and found none, on main and on the branch that adds per-state recall bars. Seed recall-proof-1 passes and starts a recall in California (place 0636294). The test needs either a place choice that guarantees a state whose rule allows a recall for an ordinance, or a reason by record why none started.

**Rules.** No dice: whether a recall starts follows the law in force and each resident's grievance and traits, never a roll. One rule, all 56 places: the test must draw places from all 56 and say why a drawn place started none.

**Done when.** With GOLDEN_PATH_SEED=recall-proof-2 and two other seeds, src/core2/recalls.test.ts passes in a played world, and each place that started no recall has the reason by record id (no petitioned doctrine, no organizer past the effort bar, or a bar on the member's term).

**Files.** src/core2/recalls.test.ts, src/core2/modules/recalls.ts

**Notes.** Fixed in this PR by raising the draw cap from 12 to 40 places: recall-proof-2 then starts a recall in Nebraska (place 3116935) and recall-proof-3 in Oregon (place 4172500). Each place that started none now says why in the failure message (no council seat held by a person; the state's law has no petitioned recall; no ordinance the council would pass; or an ordinance enacted with no organizer past the effort bar or every member inside a bar on the term), and the test fails if a place has no reason. The last case still lumps two causes together. Found Oct 20 while capturing the drawn place for PR 5186. Not caused by the per-state recall bars: same failure on main.
