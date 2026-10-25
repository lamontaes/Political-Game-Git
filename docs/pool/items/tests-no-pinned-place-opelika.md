---
id: tests-no-pinned-place-opelika
title: "census-scale-closures-opelika.test.ts pins Opelika, Alabama (0157048) and seed op1; tests draw a random place from all 56 and name it"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added by the acting CTO, Oct 22 merge sample
claimed-at:
---

**What.** PR #5553 (world-census-scale-closures-rise) added src/core2/census-scale-closures-opelika.test.ts with `const OPELIKA = { key: "0157048", seed: "op1" }` and both cases built on that one town. A pinned place proves the regression that was found, but it never checks that the rule holds anywhere else. Rewrite the file so each case draws a place from all 56 states and territories (drawPlace with a seed the test did not choose, bounded retries where a place has no wholesaler or retailer), prints the drawn place, key and seed in the failure message, and keeps Opelika only as a named regression seed that runs when CENSUS_CLOSURES_SEED (or the existing seed env) is set.

**Rules.** One rule, all 56 places: a test that pins a place proves nothing about the other 55; the drawn place is named in the assertion message so a failure can be reproduced. Never loosen or skip a test: the closure bound and the owner-draw equality stay exactly as they are; only the choice of town changes, and the 1,200-second limit keeps its measured reason.

**Done when.** The test draws its place (not a literal GEOID), passes on two random seeds and on the Opelika regression seed, and the PR body names each drawn place and seed with the run time; `npm run typecheck`, eslint and prettier on the changed file are clean.

**Files.** src/core2/census-scale-closures-opelika.test.ts, src/core2/census-scale-closures-support.ts

**Notes.** Found in the acting CTO's Oct 22 merge sample of #5553. Rename the file to census-scale-closures.test.ts if nothing imports it by name.
