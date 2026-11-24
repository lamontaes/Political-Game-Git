---
id: counted-weight-release-pinned-city
title: "The weight-release test's large city is drawn at run time, and its sample world carries weights it should not"
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
root: none
lead: money
model: opus
effort: medium
source: "T54's gate of #9579, Nov 15 23:20Z; Account lead's ruling 23:25Z (a test that draws its city from the tree's hash breaks the no-draws rule and can never be a known red by seed; file it with the next PR, naming a pinned place and the weights fault to trace)"
---

**What.** `src/core2/counted-weight-release.test.ts` has a second case, "a drawn city above 100,000 at its Census size behaves the same", whose city is drawn from a hash of the tree, so each tree runs it at a different city and nobody can name its red by seed. It fails on the Train at the same line in each city it drew: "the sample world's weights: expected N to be 1". On 7deed8ee it drew South Bend IN (1871000, seed ec0ef0c147ca183f129c5842d1ffb3aaeaf87072a24942dfa48f50a55aa8c3ba, base d8e31fc0910e69a4) with N 729.1; on the clean Train ef708196 it drew Providence RI (4459000, seed 134d9843cdf55ae515aa4b1d8e17d4ed5a097e2d2753dfaffeb3f7583f7ee0a3, base 86f6a48cbd195f47) with N 1891.3. Its first case (Washington D.C., seed dc-closures-a) passes on both. Seen: the test's own message.

**Cause.** Needs cause. Found in code so far: the case picks its city at run time (the test file's draw from the tree's base hash), which the pinned-tests rule forbids. The weights fault is not traced: the sample world, built at the sample's size, carries a household whose weight is far above one, which the test's premise says cannot happen. Trace which household carries it and which step sets it. Pinning the case goes with the fix: South Bend IN (1871000) with the seed above, red there now, is the place to pin it.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus, medium.

**Rules.** One rule, all 56 places: the case names its city and seed in the test file and picks none at run time, and a re-pin states the old premise and needs the lead's yes.

**Done when.** The case runs at a named city and seed written in the test file, and the trace names the step that sets a sample world's weight above one, by household id, with its fix or its own item. A second session sees in the running game, at a drawn place above 100,000 it names with its seed, opened at its Census size, that a household filled in from the sample-size world stands for one household in dev mode's Trace.

**Waits on.** Nothing.

**Files.** src/core2/counted-weight-release.test.ts.
