---
id: tests-drives-economy-prove-oneself-low-maytown
title: "M1-11 drives-economy: 1.2 percent of displaced workers set out to prove themselves in Maytown, Kentucky, below the 6 percent floor, red on the Train"
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
root: design-one-model-two-tiers
lead: governing
model: sonnet
effort: medium
source: views thread, Nov 16 (CI of the main-into-Train merge)
---

**What.** The golden-path year check M1-11 runs src/core2/drives-economy.test.ts in the place the runner draws from the commit. At Maytown, Kentucky, only 1.2 percent of displaced workers form a prove-oneself ambition, against a floor of 6 percent minus its slack (3.0 percent). The other four cases pass.
Seen: Maytown, Kentucky, seed 557be11b36cddcc1a09f8feede0919fb75aa9bf04be095068dbd657c6eae3a6c (the runner's draw for commit 6eb1ff91280bb03fca7ca420f2a1238cf0ff5831). It fails the same way on a clean checkout of the Train head a62a2fdad884ccd1313d1e1436088fe05986d49b and on the main-into-Train merge. Replay with `node --import tsx tests/golden-path/runner.mjs --only-long --commit 6eb1ff91280bb03fca7ca420f2a1238cf0ff5831`.

**Cause.** Needs cause. Looked at: the replays named under Seen. The clean Train fails the same way, so the merge did not cause it. The done items people-displaced-ambition-share-high and drives-displaced-prove-oneself-over-band-again were the share running too high; this time it runs too low.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** No dice: the share comes from the displaced workers' traits and conditions, and the band only checks the total.

**Done when.** The Maytown seed above passes, and a second session runs M1-11 on the Train in a drawn place (place and seed named) and sees it pass.

**Waits on.** Nothing.

**Files.** src/core2/drives-economy.test.ts

**Notes.**

- Nov 16, views thread: assertion "expected 0.011811023622047244 to be greater than 0.030197500501166808" at drives-economy.test.ts line 71.
