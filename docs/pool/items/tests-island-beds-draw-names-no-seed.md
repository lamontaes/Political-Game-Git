---
id: tests-island-beds-draw-names-no-seed
title: "The drawn island-area shelter beds test fails without naming its draw"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Laws thread, Nov 15, 2026, gating #9558 (the builders' price base) beside the housing tests
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
---

**What.** The test "the beds the eviction path reads in American Samoa or the Marianas are the island-area median per 10,000" draws its seed at random and prints the seed only when it passes. When it fails, nobody can replay the draw or show whether the same draw is red on the clean Train. Seen: gating #9558 at 5d5431ce, it failed with "territory:AS:aua: expected 1 to be +0" and no seed; the same file passed on the clean Train 29ef4685 on another draw (territory:MP:chalan-kanoa, seed 3a311a225d4e3a58:2).

**Cause.** Found in code: src/core2/housing-homeless.test.ts, describe "shelter beds in a drawn island area": the seed (`process.env.GOLDEN_PATH_SEED ?? randomBytes(8)`) goes into the success line and the bounded-redraw error, but the `expect(beds, place.key)` message at line 491 names only the place key.

**Fix.** Pin the test to named island-area places with fixed seeds (`pinned-tests`), one in American Samoa and one in the Northern Marianas big enough that the two rates give different beds. If it must stay drawn, its assertion messages name the seed and attempt. Then replay territory:AS:aua to find whether the bed count or the test is wrong. The player sees the bed count on the eviction path's shelter line.

**Time box.** 1 hour for one Sonnet session at low effort.

**Rules.** One rule, all 56 places: the test's places are island areas named in the test file with their seeds, so a failure can be replayed on the clean Train and on any branch.

**Done when.** A second session runs src/core2/housing-homeless.test.ts twice on main, sees the island-area test pass at its pinned places, and sees that any failure line in that test names its place, its seed and the beds it expected.

**Waits on.** Nothing.

**Files.** src/core2/housing-homeless.test.ts
