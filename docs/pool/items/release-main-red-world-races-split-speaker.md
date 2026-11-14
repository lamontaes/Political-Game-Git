---
id: release-main-red-world-races-split-speaker
title: "The split-election case builds a Congress with no Speaker, so a tied Senate leaves no one to act as president"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-world-races-split-election
pr: #9032
after:
blocked-on:
lead: gov
model: opus
effort: low
root: none
source: Red desk, Nov 13 (Account lead T1 on #8928, comment 6846824079)
---

**What.** `src/core2/world-races.test.ts` fails its split-election case on clean main at GOLDEN_PATH_SEED=0a7f7b06a84247f51f37b1c2af021363f6f84134e880761fcc4b0e1ebd4a9fa9 (Indiana, place 1828296): the House deadlocks 25 states to 23 (26 needed) and the Senate ties 50 to 50 (51 needed), so the acting president falls to the Speaker, and the record's acting is null. The case's own world never installs the leadership module, so the House has no Speaker in it, though the played world installs it (src/bench/world.ts). Guards: the contingent election's acting president when the House and the Senate both fail to choose.

**Cause.** Found in code: `leaderOf` in src/core2/modules/leadership.ts returns null when the leadership module is not installed, and `contingentElection` in src/core2/contingent-election.ts reads the Speaker through it after the vice president-elect; the test's world opens laws, offices, elections, campaigns, parties, voting, the legislature and world races, but not leadership.

**Fix.** Test only: the split-election case opens the leadership module after the legislature, as the played world does, so the House's Speaker is the post the acting order reads. No assertion changes.

**Time box.** 1 hour

**Rules.** Wire to the world: the case's world installs the module the played world has for the read it tests, and no assertion is loosened or skipped.

**Done when.** A second session runs world-races.test.ts on main at GOLDEN_PATH_SEED=0a7f7b06a84247f51f37b1c2af021363f6f84134e880761fcc4b0e1ebd4a9fa9 and at a fresh seed, naming the drawn state and place, and all three cases pass with the contingent report at that seed reading deadlocked with the Speaker acting.

**Waits on.** Nothing.

**Files.** src/core2/world-races.test.ts
