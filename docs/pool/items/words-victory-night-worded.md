---
id: words-victory-night-worded
title: "The victory night after a won race is never worded: no opponent fact for a winner"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The race-won scene (purpose victory-night) states its ask with {opponent}, but purpose-scene.ts read the opponent only from a rival the record names (rivalId) or, for a loser, the winner. A result record names neither for its winner, so the scene was skipped ('the ask that states victory-night cannot be worded from the records given'; Villa Esperanza, Puerto Rico, diag seed 4).

**Rules.** No hand-written player text. The opponent is read from the count (totals), never guessed.

**Done when.** In a played world (victory-night.test.ts, drawn places, place and seed named), a winner's race-won scene composes and its opponent is the runner-up on the count; an unopposed winner has words that need no opponent.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/victory-night.test.ts

**Notes.** Lane 3, Nov 4: built on lane3/victory-night.
