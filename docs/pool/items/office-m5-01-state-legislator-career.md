---
id: office-m5-01-state-legislator-career
title: "M5-01 State legislator career"
area: office
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone: M5
source: "docs/roadmap/later-specs-draft.md M5-01"
---

**What.** Pick a real numbered seat, file, campaign against the actual holder, take the seat, and pass bills with colleagues. (Owner: OPUS-GOV (screens: OPUS-PLAY).)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** In a random state, the player replaces the right member at the start of the term and passes a bill.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Checked Oct 20 (claude, claude/political-game-pool-76ksvw): `src/core2/state-legislator-career.test.ts` passes in a drawn state (seed slc1, US-ID place 1645820): the player files for their real numbered seat (seat:US-ID:upper:035:0), campaigns against its actual holder (Darlene Keller), and the voters decide; in this run the holder won (10,002 to 5,636), so the "a win seats them on the term's first day and they pass a bill" branch did not run, and a seed where the player wins is still to be seen. The test does not cover the spec's in-session half (a bill through committee, amendments, the floor and the governor's action with staff, and choosing capitol or home each week). The same file's M5-04 test (the town's U.S. House seat) also passed, with the holder winning, 149,167 to 84,497.
