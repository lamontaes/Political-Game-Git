---
id: office-m5-01-state-legislator-career
title: "M5-01 State legislator career"
area: office
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr: #5421
blocked-on:
milestone: M5
source: "docs/roadmap/later-specs-draft.md M5-01"
claimed-at:
---

**What.** Pick a real numbered seat, file, campaign against the actual holder, take the seat, and pass bills with colleagues. (Owner: OPUS-GOV (screens: OPUS-PLAY).)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** In a random state, the player replaces the right member at the start of the term and passes a bill.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Verified Oct 20 (claude, claude/m5-01-verified), nothing to build for the engine half: `src/core2/state-legislator-career.test.ts` (M5-01) draws a state at random and plays the done-when line: the player picks the numbered seat covering their town, files against its holder, campaigns, the voters decide, the winner replaces the holder on the term's first day and passes a bill with colleagues. It passes on main today (1 file, 2 tests). What this item still lacks is the screen half the owner's note names (OPUS-PLAY): choosing a seat and following the campaign on the play page. That belongs in a new play-area item, not this engine one. The CTO can mark the engine half done.
