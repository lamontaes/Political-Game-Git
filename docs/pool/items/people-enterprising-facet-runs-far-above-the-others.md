---
id: people-enterprising-facet-runs-far-above-the-others
title: "Drawn people carry the enterprising facet far above every other facet"
area: people
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc4-hand-written-words
source: Account lead, Nov 14, 2026, from the Speeches builder's measure behind the speech-outline shape fix
checked:
---

**What.** In 2,920 people drawn in three places, the average of the `enterprising` facet is 0.573 and the average of `duty-bound` is 0.672, while the average over all 80 facets is 0.011 and the third highest is 0.159. Every reader of these two facets sees a population that leans hard one way. Measured: in a probe over `buildBenchWorld` people at the places `drawPlace` gives for seeds a:0, b:0 and c:0. Seen: in the speech outline, where figure-first led for most speakers.

**Cause.** Needs cause. Not yet found: where the opening draw sets `enterprising`, whether its 0.573 is sourced, and how much of duty-bound's 0.672 is the maturity step. Duty-bound rises with age by design (`src/core2/modules/trait-change.traits.test.ts` cites Roberts, Walton and Viechtbauer 2006), which may explain part of it.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Opus at medium, to find the cause only.

**Rules.** Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. Guards: `src/core2/modules/trait-change.traits.test.ts`.

**Done when.** The cause is written in this item. A second session reads the facet averages in three drawn places and sees the cause named, with its source or a fix item.

**Waits on.** Nothing.

**Files.** src/core2/modules/trait-change.traits.test.ts

**Notes.** The speech outline no longer depends on this: its shapes are weighed against the average (PR for item speech-outline-point-shapes-red-by-draw).
