---
id: laws-took-effect-for-row-not-in-force
title: "A scheduled law row that a later repeal overrides still emits 'took effect', so the paper and bring-it-up report a change that never happened"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/took-effect-superseded
pr: #6339
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T15:22:15.527Z
---

**What.** In the played Ohio world (Aberdeen, key 3900142, seed ce3235656174370b:ohio) HB 3 ends the state minimum wage on April 28, 2025. The starting law still holds scheduled rows effective 2026-01-01 (law:US-OH:state:minimum-wage:general:2026-01-01 at $11.00 and its small-employer tier at $7.25). lawInForce on 2025-12-31, 2026-01-01 and 2026-01-02 shows the state level at 0 and the wage at $7.25 on all three days, yet lawTookEffect in src/core2/modules/laws.ts emits 'law-took-effect' for both rows because it checks only the row's date (inForceOn), not whether the row governs after the repeal. The press wire and the director then carry a rise that never happened.

**Rules.** No dice. Wire to the world: the fix applies to every series and place, and a scheduled row an enacted law replaced emits nothing. An effect is a read: the check reads the same lawInForce the engines read.

**Done when.** In a played world (buildBenchWorld) in Aberdeen, Ohio (key 3900142, seed ce3235656174370b:ohio) run to January 3, 2026, no law-took-effect record is emitted for the 2026-01-01 minimum-wage rows, and in a second place drawn from all 56 a test that enacts a repeal over a scheduled row shows no took-effect record for the overridden row; a test in src/core2 covers both and names the place and seed.

**Files.** src/core2/modules/laws.ts

**Notes.** Found while building world-press-amount-law-never-printed (PR 6247); the item that sent me there expected a January 1 wage rise that the world does not have.
