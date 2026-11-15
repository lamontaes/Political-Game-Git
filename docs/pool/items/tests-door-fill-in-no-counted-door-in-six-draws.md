---
id: tests-door-fill-in-no-counted-door-in-six-draws
title: "The door fill-in test finds no counted resident opening a door in six drawn places"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-one-model-two-tiers
lead: governing
model: sonnet
effort: medium
source: views thread, Nov 14 (seen while gating views cut 3b)
---

**What.** The test that checks an evening of the player's doors fills in only the residents a porch scene could cast found no counted resident at a door in any of its six drawn places, so it checks nothing and fails. Either three hours of the oldest adult's doors reach only full people in those towns, or the walk list skips counted households. A player whose doors reach no counted resident would talk only to people already met. Seen: a doors outing's result on the Campaign tab.

**Cause.** Needs cause. Measured: `DOOR_FILL_SEED=d708bcfbdaba1e9c npx vitest run src/core2/door-fill-in.test.ts` fails "seed d708bcfbdaba1e9c: no drawn place had counted residents at a door". Red on the train at 214e6a6e, with no views-from-life cut 3 change.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** Tests are pinned to named places and seeds where the case occurs (pinned-tests). Never loosen a test to get green.

**Done when.** The test passes at seed d708bcfbdaba1e9c or is pinned to named places where counted residents open doors; a second session, on the train or main in a drawn place it names with its seed, knocks doors for an evening and sees counted residents reached on the outing's result.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts (walkDoors, countedToFill), src/core2/door-fill-in.test.ts

**Notes.** Nov 14 (claude, views thread): found while gating views cut 3b; red on the clean train at the same seed. The test prints "no counted resident opened" for each place it passed over; read those lines first.
