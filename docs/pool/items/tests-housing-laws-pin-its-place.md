---
id: tests-housing-laws-pin-its-place
title: "The housing-laws test draws its place at run time, and is red at Christiansted, U.S. Virgin Islands: two in the tenant's home learned of the saving"
area: world
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: renters
source: story builder thread, Nov 16, the Account lead's ask on the reds of #9604
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The housing-laws test draws a new place every run, so it is green or red by luck. On one draw its controlled edge case is red. It expects one adult in the tenant's home to learn of the rent saving from the renewal notice, and two hold a rent stance. Seen: at Christiansted in the Virgin Islands, red the same with and without #9604.

**Cause.** Measured: at Christiansted, U.S. Virgin Islands (territory:VI:christiansted), seed c767d15a1b250d1fa138c862d3aa233c916b5080e9471c6e3289e7405aa7249d, by `LAW_LINK_DRAW=<that draw as JSON> npx vitest run src/core2/housing-laws.test.ts`, "nobody learned of the saving: expected 2 to be 1". Found in code: src/core2/housing-laws.test.ts line 20 draws with `randomBytes` when `LAW_LINK_DRAW` is unset.

**Fix.** Pin the test to named places with fixed seeds (skill `pinned-tests`), Christiansted at the seed above among them. Then find which second member of the household holds the rent stance and where they learned it, by the stance's `learnedFrom`. Either the second record is right and the test's count of one is wrong, or the stance came from the wrong record, which is a separate fix.

**Time box.** 2 hours.

**Rules.** Ask why: each stance in the household is traced to the record that taught it.

**Done when.** A second session runs the pinned test, which names Christiansted and its seed, and it is green. A drawn place, Christiansted, U.S. Virgin Islands (seed c767d15a), shows each rent stance in the tenant's home with the record it came from.

**Waits on.** Nothing.

**Files.** src/core2/housing-laws.test.ts
