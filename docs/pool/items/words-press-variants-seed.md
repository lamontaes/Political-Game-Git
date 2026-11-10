---
id: words-press-variants-seed
title: "The reporter-variant test follows the engine's rule when a reporter's temper favors the friendly arc"
area: words
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: story/press-variants-seed
pr: 8102
blocked-on:
lead: words
milestone: play-first
source: "press-comment-variants.test.ts red on main with GOLDEN_PATH_SEED=5: expected 'friendly' to be 'scandal'"
claimed-at: 2026-11-10T05:00:00.000Z
---

**What.** On seed 5 (Westmoreland, Kansas, seed 5:3) the scandal probe went to a reporter with a friendly pull of 0.75 and a scandal pull of 0.00. The engine's sum is each variant's reads times one plus the reporter's pull: friendly 0.833 x 1.75 = 1.46 against scandal 1.371 x 1.00 = 1.37, so friendly legitimately won. The engine is right; the test assumed the temper never decides. The probe now goes to the town's reporter whose temper leans most toward the scandal over the friendly arc, each given the same five earlier talks, and logs the deciding scores, reads and pulls.

**Done when.** src/director/press-comment-variants.test.ts passes on seeds 5, 7 and 99, logging the scores; arc-variant.test.ts, director.test.ts and the families guard pass.

**Files.** src/director/press-comment-variants.test.ts

**Time box.** 1 hour.

**You will see.** Nothing changes in play.
