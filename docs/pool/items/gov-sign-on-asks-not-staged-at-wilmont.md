---
id: gov-sign-on-asks-not-staged-at-wilmont
title: "The bill sign-on test finds no staged asks at Wilmont, Minnesota on the Train"
area: gov
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead, Nov 16: bill-sign-on Wilmont MN red on Train 2 head ef708196, found while gating the favor fix"
claimed-at:
after:
lead: laws
model: sonnet
effort: medium
root: rc3-thin-life-record
---

**What.** The test `the player asks, the colleague answers from the record, and a yes is a name the chair weighs` in `src/director/bill-sign-on.test.ts` fails at Wilmont, Minnesota, where the player's bills are drafted and no sign-on ask is staged on the player's schedule. A player there who drafts bills is never asked by the game to go to colleagues for their names. Seen: the played world at Wilmont, Minnesota (place 2770582, world seed 2cb5aaf15d55f6b06548834319221a87402931e3d1570c6e674f546d2ff2025f), after drafting a bill on each question and playing two days.

**Cause.** Needs cause. Measured: `npx vitest run src/director/bill-sign-on.test.ts` fails the same way with and without the favor fix of #9609 (checked on the Train head ef708196 before the change): "the asks are staged: expected 0 to be greater than 0" at `bill-sign-on.test.ts:188`; the place and seed are pinned in the test (`PLACES`, drawn once by `bill-stages-state`), not drawn at run time. Whether the other two pinned places (Manteca, California and the third) stay green is not measured.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** No dice; the asks come from who the player knows (`askToSignOn`).

**Done when.** At place 2770582 with the world seed above the test passes by the player's presses, and a second session on main, in a place and seed it names, sees the sign-on asks staged after drafting.

**Waits on.** Nothing.

**Files.** src/director/bill-sign-on.test.ts; src/core2/modules/legislature.ts
