---
id: people-trust-lost-costs-share-of-tie
title: "Trust lost (a lie found out, a word broken to their face) costs a share of the tie, not a fixed two hours"
area: people
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/project-thread-csmftn-share
pr: #9498
after: core-strain-lost-on-shared-time-ties
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Lying builder, Nov 15, from the recount of lies told at three places (Account lead's ruling and Words lead's yes)
merged-at: 2026-11-15T21:50:37.192Z
---

**What.** An ending that keeps trust lost (a lie found out, a promise broken to their face) took a fixed two hours off the tie, so a lifelong friend and a stranger lost the same time and the close tie lost almost nothing. People tell fewer everyday lies to those they are close to and are more uncomfortable telling them (DePaulo and Kashy 1998), so losing trust should cost a close tie more. Seen: in dev mode, a scene that ends in trust lost between close friends cools their tie by a quarter of its hours, and between two members who know each other only from the floor by a quarter of theirs.

**Cause.** Found in code: `replyInScene` in src/director/purpose-scene.ts read `ENDING_STRAIN[ending.keeps]?.value` as hours for every row, and scene-talk-rules endingStrain trust-lost was a fixed 2.

**Fix.** The trust-lost row becomes a TUNABLE share of the tie (`unit` "share of the tie", 0.25, spread 0.1 to 0.5, DePaulo and Kashy for the direction only), read through `endingStrainHours` in purpose-scene.ts against `tieHoursBetween` in src/core2/closeness.ts (the row's hours faded, less what it owes, plus shared sittings and work). A strained ending stays one hour.

**Time box.** 2 hours, one Opus session at medium effort.

**Rules.** Wire to the world: the ending writes through the one relationship writer every engine reads. No dice: the cost comes from the tie's hours and the row's share, never a chance.

**Done when.** At the named place territory:AS:maia seed 0b6c599b2140735b80cdc730a4793e7054568c52f90bd08df2761745ff6cdc21, `src/director/ending-strain-share.test.ts` shows a trust-lost ending taking the same share of the closest pair's tie and of two legislators' tie, the close pair losing more hours, and a strained ending costing both one hour; a second session sees it in dev mode on main.

**Waits on.** core-strain-lost-on-shared-time-ties (#9491) on the Train.

**Files.** src/director/purpose-scene.ts, src/core2/closeness.ts, src/director/data/scene-talk-rules.json, src/director/ending-strain-share.test.ts (new)
