---
id: drives-displaced-ambition-floor-small-town
title: "M1-11 red on main in Playita, Puerto Rico: 1 of 17 displaced workers forms an ambition, under the 6% floor"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The accepted spec M1-11 fails on main 90e3abef7 in Playita, Puerto Rico (place key 7263503, seed 8be0e68a6844fe807895aebee61028b0fc511fbe4baf92fc675e9d19d427046b). In src/core2/drives-economy.test.ts, the test 'forms ambitions at the displaced-worker rate, with most people carrying on' saw 0.0588 (1 of 17 displaced workers) against a floor of 0.06. The town is small, so one person moves the share by six points; the band check reads a share of too few people to hold either way.

**Cause.** Needs cause. Looked at: `src/core2/drives-economy.test.ts`, 'forms ambitions at the displaced-worker rate, with most people carrying on', which saw 0.0588 (1 of 17 displaced workers) at Playita, Puerto Rico (place key 7263503, seed 8be0e68a6844fe807895aebee61028b0fc511fbe4baf92fc675e9d19d427046b) and 0.0559 (9 of 161) at Bellview, Florida (place key 1205462, seed 68c7747a284e52a1b25d6cb988de91bd09a04462452082d58f951267965e14de), against a 0.06 floor. The second sample is not small, so the rate itself sits just under the floor. The drive's formation rule has not been read.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session, to read the drive's formation rule and then fix it.

**Rules.** No dice: the floor must come from the drive's own causes, not a rerun until a seed passes. One rule, all 56 places: a small town must pass by the same rule as a large one, so the check needs a sample size or a spread that a 17-person sample can meet. Ranges are not targets (owner, Nov 8): the real displaced-worker rate is reported, never steered to.

**Done when.** A second session runs `src/core2/drives-economy.test.ts` at Playita, Puerto Rico (7263503) with the seed above, at Bellview, Florida (1205462) with its seed, and in a second drawn small place (name and seed), and it passes. It reports the share of displaced workers who formed ambitions in each place and the number of displaced workers behind it. In a played world in a drawn place it finds a displaced worker's ambition formed from the worker's own records, by record id, and the golden-path runner shows M1-11 passed on main.

**Waits on.** Nothing.

**Files.** src/core2/drives-economy.test.ts

**Notes.** Oct 29, 05:00 UTC, words and director session: also red on main 886c21ab72 and on 7abade8252 (before #6736) in Bellview, Florida (place key 1205462, seed 68c7747a284e52a1b25d6cb988de91bd09a04462452082d58f951267965e14de), the golden-path-year draw for #6736: a share of 0.0559, which is 9 of 161 displaced workers. That sample is not small, so a spread sized to the sample alone may not clear it; the rate itself sits just under the floor.
