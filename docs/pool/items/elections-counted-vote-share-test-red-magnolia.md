---
id: elections-counted-vote-share-test-red-magnolia
title: "The counted-vote-share tally test is red at Magnolia, Delaware: a counted record's kept split is 1 where the formula gives 0.52"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
lead: governing
source: Account lead thread "Make elections read your record", Nov 14 (red on the clean train 8bc765b3 and on #9191)
claimed-at:
---

**What.** `src/core2/counted-vote-share.test.ts` case (d) fails at a fixed draw: `COUNTED_SHARE_SEED=e2051d49e318d174 npx vitest run src/core2/counted-vote-share.test.ts` draws Magnolia, Delaware (place key 1044430), world seed 55a4fe01cf3f02e6eab932b0f8119845b7e495c5067b24586420f8937cffafaa, contest `contest:seat:gus2025:207646:council:0:2026-04-07`. The kept split for record `person_06ffe5a401dfa6d9` for candidate `person_153b71e4e80fd494` is 1, and the test's own recomputation from the kept appeal gives 0.5174731946594913. Seen: in the town's counted vote on that race.

**Cause.** Needs cause. Measured: the same assertion fails with the same numbers on the clean train head 8bc765b3 and on the branch of #9191, so it is not caused by the counted-case warmth change. Candidate places to look: the ballot rule in `countedDivision` (src/core2/modules/voting.ts) against the test's `divide()` for a race with and without party labels, and a record whose pledge or pledged choice is set.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a counted record's split is a share of its count, never a roll. Never loosen the test to get green; it is pinned to a named place and seed as `pinned-tests` says.

**Done when.** A second session runs the command above on main in the drawn place, Magnolia, Delaware (place key 1044430, seed e2051d49e318d174), and the test passes there, and in two other drawn places with their seeds pinned in the test file; the cause is named in the item's Notes by record id.

**Waits on.** Nothing.

**Files.** src/core2/counted-vote-share.test.ts, src/core2/modules/voting.ts

Nov 15 (views thread): still red on the train at ff9703d7 with GOLDEN_PATH_SEED=677b2a035fef1f4f, at Clyde Park, Montana (3015550), world seed c777ff85: in contest:seat:gus2025:169466:council:0:2025-11-04, record person_03a575eda173eaaf for person_0e4c0b3cdbd4be63 has a kept split of 1 where the formula gives 0.40.
