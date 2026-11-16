---
id: tests-estates-counted-kin-draws-a-random-seed
title: "The counted-kin estate test draws a fresh random seed and loops up to eight worlds, so it can run past half an hour and is never the same run twice"
area: release
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: "found by T54 gating world-counted-renters-buy (#9117) on Train 88b5b879, Nov 15; Account lead's ruling 10:37Z"
---

**What.** `src/core2/estates-counted-kin.test.ts` ("pays a counted child of the dead and fills them in") takes `GOLDEN_PATH_SEED` or `randomBytes(8)` as its seed, then loops `drawPlace(`${seed}:${draw}`, "estate-counted-kin")` up to eight times, building a played world each time, until it finds a case. The pinned-tests rule forbids this: a test names its place and seed, runs about a minute, and stages a rare event through the game's own path instead of waiting for one. Seen: on the gate for #9117 it timed out at 30 minutes (1,800,000 ms), and a failure cannot be rerun on a clean base because the next run draws different worlds.

**Cause.** Found in code: lines 17 to 23 of src/core2/estates-counted-kin.test.ts (the random seed and the `for (let draw = 0; draw < 8; draw += 1)` loop over `buildBenchWorld`).

**Fix.** Pin one named place and seed where a counted household with a counted child exists on day one, as `opening-kin-cash.test.ts` pins Bastrop, Louisiana (2204685, `drawPlace("c3","home-price-paths")`), and stage the death through the game's own path (the estates engine's own death call on a named counted parent), so the test runs once, in about a minute, with an explicit timeout near twice its measured time. Keep every assertion it has now.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never loosen a test to get green; the test names one place and seed and stages the death through the estates engine. One rule, all 56 places: the pinned place is any of the 56, named in the test.

**Done when.** The test names its place and seed in its header, has no loop over draws or random seed, runs under two minutes, and passes; its break-it check (the counted child's payment removed) fails it. A second session, at a drawn place it names with its seed, sees in dev mode a counted parent's death pay the counted child, filled in as the same person.

**Waits on.** Nothing.

**Files.** src/core2/estates-counted-kin.test.ts
