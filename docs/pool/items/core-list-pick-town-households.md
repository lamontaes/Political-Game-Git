---
id: core-list-pick-town-households
title: "Replace the list-pick at town-households.ts:45 (point -= share)"
area: core
kind: cleanup
priority: 2
status: done
claimed-by:
pr: #4428
blocked-on:
milestone:
source: "astra order 3"
---

**What.** The zero-dice guard names one list-pick in the ported town builder. Replace it with a decision from the actor's reasons, or classify it in docs/design/list-pick-inventory.md with why (it only names or draws who exists).

**Rules.** No dice.

**Done when.** npm run zero-dice passes with the line addressed.

**Files.** src/core2/town-households.ts, docs/design/list-pick-inventory.md

**Notes.** None.
