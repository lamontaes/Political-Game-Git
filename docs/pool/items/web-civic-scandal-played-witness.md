---
id: web-civic-scandal-played-witness
title: "A scandal that arose in play reaches voters' ballots, by record"
area: core
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: gov-bribes-in-played-worlds-measured
source: added with npm run pool -- add
---

**What.** The voting engine's scandal term carries exposed-corruption-to-reelection: a voter who heard a story about a candidate's taken bribe or public conviction weighs it. outcome-web-civic-played.test.ts checks that every kept ballot whose voter heard such a story carries the term, but in three drawn worlds played to November 30, 2026 (Cuyamungue Grant, New Mexico; Lawton, North Dakota; Camp Sherman, Oregon) no bribe was offered at all, so no story existed and the check had nothing to hold. Once gov-bribes-in-played-worlds-measured says how often bribes should arise, find a drawn place and seed where one surfaces before a race, and name the ballot that carried the term.

**Rules.** An effect is a read, not a record: the ballot's appeal must carry the scandal term because the voter heard the story. No hand-inserted scandal: the earlier send-back refused one. No dice.

**Done when.** outcome-web-civic-played.test.ts in a drawn place (seed named) reports a scandal story about a candidate that arose in play and at least one kept ballot carrying the scandal term for that candidate, by ballot id. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/outcome-web-civic-played.test.ts

**Notes.** Split Oct 25 by the effects lead from web-reach-civic, whose economy witness is in its PR.
