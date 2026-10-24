---
id: play-first-10-journal-from-day-one
title: "The Journal opens on day one with your roots, your family and where you came from"
area: words
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release the Journal was blank for the first three weeks. The owner ruled Oct 14 that the player's own context (parents, their relationship, siblings, where the family came from and a few remembered moments) is rendered from day one, and Oct 24 that people's histories are simulated and the journal runs from day one. This item writes the opening chapter of the memoir from the player's deep past.

**Rules.** Wire to the world: the chapter reads the player's own deep-past records (parents, siblings, moves, remembered moments). No hand-written player text: the lines come from the English engine as memoir, first person.

**Done when.** In a drawn place on the first evening, the Journal shows an opening chapter naming the player's parents, siblings and family origin from their records, each line citing its record id, shown by a screenshot.

**Files.** src/director/journal.ts, src/core2/deep-past.ts, src/bench/story.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Journal words are the Words lead's (`needs-from: words`); the lane builds the screen side. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
