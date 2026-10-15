---
id: core-outside-flow-catalog-rows
title: "Outside-flow catalog lists every real exchange that crosses the town's edge"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/political-game-pool-g2977r
pr:
blocked-on:
milestone:
source: "split from core-outside-flow-provenance-gate; #4352 SESSION-B.md"
---

**What.** Add rows to `src/core2/data/outside-flows.json` for the real exchanges the sixth closure check reported as unmatched: federal borrowing (a loan from the public), counted arrivals and mover departures (a household's own money), and an entrant business's outside buyers. The treasury's spending-to-outside leg is the same registered stopgap as the outside-revenue plug, so it is a plug row naming `SG-GOV-outside-revenue-monthly`, not a match.

**Rules.** Fix at the root; no engine or classification is changed to hide a plug; registered stopgaps.

**Done when.** `node --import tsx scripts/core2-year/closures.mjs` on a drawn place reports `unmatched` empty, and the only remaining failure of check 6 is the plug rows (the stopgap's two halves).

**Files.** src/core2/data/outside-flows.json

**Notes.** Sullivan's Island, South Carolina, seed gate-repro-1: five unmatched classes before, none after.
