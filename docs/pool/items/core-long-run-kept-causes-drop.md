---
id: core-long-run-kept-causes-drop
title: "A long save keeps each circle member's last three campaign causes per candidate per fold, which nothing reads (1.16 million rows by year 22 of one save)"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: speed/causes-fold-kept-drop
pr: #6944
blocked-on:
after: core-long-run-circle-causes-fold
source: added with npm run pool -- add
claimed-at: 2026-10-30T09:20:03.360Z
---

**What.** When a race closes, the campaigns engine (src/core2/modules/campaigns.ts foldCauses) folds each voter and candidate's contact rows into a summary, and for a voter in the player's circle it also keeps that fold's latest three rows in foldedCauses. Each fold keeps three more, so a pair keeps three per fold, and the table grows as circle members times candidates times folds. In one Ringgold, Louisiana save (seed long-1) it held 270,470 rows by year 8 and 1,158,647 of 4.1 million records by year 22, the largest table, while the race standing and the door scene read only the summaries and the trace reaches only a fact-named cause.

**Rules.** Speed: years 97 to 100 of a save run at most 1.2 times as long as years 1 to 4, and records kept hold the same way; old records fold into summaries once play no longer reads them. An effect is a read, not a record: a kept row nothing in play reads is an unregistered placeholder (CTO, Oct 30, amending the 03:05 ruling).

**Done when.** foldCauses keeps in foldedCauses only causes a voter's known fact names, and causesKeptPerCandidate is removed; src/core2/campaign-causes-fold.test.ts passes in a drawn place; a 4-year speed:year run of seed long-1 against the circle fold's head differs in dev mode's records proof only in foldedCauses, with its rows before and after and the readers swept in the PR body.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json

**Notes.** TODO
