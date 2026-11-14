---
id: play-plain-text-check-draw-path-finds-developer-text
title: "The plain-text check, run on a drawn place, once ended on developer text a player could read"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: found by fixer F6 while carrying #8795 (Nov 14)
after:
lead: play-first
model: sonnet
effort: medium
root: none
---

**What.** With `PLAIN_TEXT_DRAW=1 node src/bench/plain-text.browser.mjs` (fresh draws of place and seed, the check as carried in #9116), 1 of 8 runs ended on a failed text check ("found" list not empty); the other 7 passed (Cherry Valley PA, Eureka NV, Penfield PA, Nesquehoning PA, Chilchinbito AZ and two more). The default run on Junction City GA passed 4 of 4.

**Cause.** Needs cause. The place, the seed and the text were not captured on the failing run, so nothing is known about what a player would read or which screen showed it.

**Fix.** Run the draw path until it fails (the run prints the seed first and the failure prints the text and its screen), then add the place key and seed here and build the fix in the engine or bank that wrote the text.

**Time box.** 2 hours to reproduce; the fix is sized when the text is known.

**Rules.** Words come from the English engine's banks; screens show record data only through worded labels.

**Done when.** A named place and seed reproduce the failure and, after the fix, `PLAIN_TEXT_PLACE_KEY=<key> PLAIN_TEXT_SEED=<seed> node src/bench/plain-text.browser.mjs` ends "PASS".

**Waits on.** Nothing.

**Files.** src/bench/plain-text.browser.mjs
