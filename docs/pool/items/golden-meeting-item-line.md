---
id: golden-meeting-item-line
title: "The meeting's bill row prints its subject with a stray number: Allow multifamily in single family zones 0"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: golden-path playthrough, Oct 28
lead: play-first
milestone: play-first
---

**What.** At the meeting where the player's ordinance is voted (golden path step 8), the panel under the bill's title prints each provision as its policy label and raw amount: "Allow multifamily in single family zones 0", "Civilian oversight of police 0", and for a tax or a budget line the raw series or line key. The title above already names the bill and Read the bill shows its sections. Seen in Williamstown, Massachusetts and Kenton, Oklahoma.

**Rules.** No hand-written player text and player-screen-text: no record keys or bare numbers on a player screen. Replace, never layer: the line goes, and the bill item the meeting and the desk read stops carrying the raw provisions.

**Done when.** The test src/bench/office-bill-title.test.ts, in a buildBenchWorld drawn place with the seed it names, asserts the meeting's bill item carries no raw provisions; it fails with main's office.ts and passes on the branch.

**Time box.** 1 hour.

**You will see.** At the meeting, the bill reads by its name, number and sponsor, then who spoke for and against, then the votes.

**Screenshot.** The before screenshot from Williamstown in the PR; the after is the same panel without the line.

**Files.** src/bench/play.mjs, src/bench/office.ts, src/bench/office-bill-title.test.ts

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `golden/meeting-item-line` is kept; claiming this item takes it over.
