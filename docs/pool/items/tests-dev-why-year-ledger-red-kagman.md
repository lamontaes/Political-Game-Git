---
id: tests-dev-why-year-ledger-red-kagman
title: "dev-why test: a worker's year ledger has no pay row at Kagman I, and the test draws its seed at run time"
area: play
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
lead: fable
model: sonnet
effort: medium
source: views thread, Nov 16 (gate of the held-over seat change)
---

**What.** In src/bench/dev-why.test.ts, the case "a person's year ledger lists pay, hours and cash" finds a living worker whose cash is itemized, but that worker's ledger has no "pay" row. The test draws its seed with randomBytes at run time (DEV_WHY_SEED replays it), so it is red only on some draws. An older item for the same case, bench-dev-why-year-ledger-red, was dropped.
Seen: Kagman I, Northern Mariana Islands, seed b99b145d49dbabfd, by `DEV_WHY_SEED=b99b145d49dbabfd npx vitest run src/bench/dev-why.test.ts`, red on the Train at ef708196.

**Cause.** Needs cause. Looked at: the run named under Seen, red on a clean checkout of the Train head ef70819622c9bc399e73c39e928c226e1f35afee and on the held-over seat branch alike, so the held-over seat change did not cause it.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** One rule, all 56 places: the case must pass at every place, and the test names its seeds instead of drawing them.

**Done when.** The ledger case passes at Kagman I seed b99b145d49dbabfd and at a second named seed, and a second session sees the worker's pay row in dev mode's why panel in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/dev-why.test.ts, src/bench/dev-why.ts
Nov 16 (views thread): the pinned Kagman I ledger case passes on the Train at 8d26a629 with #9713 and #9710 merged in (46 s; all 12 dev-why cases pass), so it is not an expected failure. What made it pass was not traced; the item stays open for the cause of the earlier red.
