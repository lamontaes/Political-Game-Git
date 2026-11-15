---
id: tests-voter-groups-sample-misses-counted-adults-rayne-la
title: "voter-groups fails in Rayne, Louisiana: the electorate sample leaves out 23 of the town's counted adults"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the bargaining thread (brief O) from the golden-path run on PR 9356 (M0-09), Nov 14 2026; the same red on the clean train e24cb825
lead: m0-m2
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
---

**What.** src/core2/voter-groups.test.ts, "voter groups are the counted electorate", fails in Rayne, Louisiana (2263645), seed 1e46ad447eab53873d898c7f34f112e987abc62b91f314eba20274542891132c (the golden path's M0-09 draw on PR 9356). The assertion that the electorate sample holds every counted adult of the town once finds 5,233 ids in `electorateSample(api, core.date, 0)` against 5,256 counted adults: 23 are missing. It fails the same way on the clean train e24cb825, without PR 9356's change. Not the weight-below-one fault (core-voter-household-weight-below-one): that one fails an earlier assertion. Guards: the election engine's sample of the town's voters, which every race in the town reads.

**Cause.** Needs cause. Leads to check first: who the 23 are (age 18 on the day, a household that moved or a place id other than the town's), and whether `electorateSample` reads age or residence on a different date than `countedResidents`.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion as it stands. One model, two tiers: the sample and the counted rows read the same rule. One rule, all 56 places.

**Done when.** A second session runs the test, and it passes at Rayne with the seed above and at two more places drawn from all 56 (names and seeds written down), with no assertion changed; in the running game at Rayne, dev mode's town electorate counts the same adults as the counted rows.

**Waits on.** Nothing.

**Files.** src/core2/voter-groups.test.ts, src/core2/modules/voting.ts

**Notes.**
