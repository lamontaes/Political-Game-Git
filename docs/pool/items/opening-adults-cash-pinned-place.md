---
id: opening-adults-cash-pinned-place
title: "The opening adults' cash test draws its town at run time, and in two territory towns 19 resident adults hold nothing"
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
source: "T54's trace for #9597, Nov 16 00:50Z (the Account lead's order of 00:30Z: every related red explained, and an item for each that stays red; a run-time draw is pinned, as for counted-weight-release)"
---

**What.** `src/core2/opening-adults-cash.test.ts` draws its town from a random seed unless `GOLDEN_PATH_SEED` is set. It drew Leloaloa, American Samoa (seed 6682f9f6c16ebcfb) in the #9597 run and Tutu, U.S. Virgin Islands (seed 722c036a9cce0bae) on the clean Train, and failed at both: 19 of 65 and 19 of 67 resident adults hold nothing, against at most about 25%. Replayed by seed, both are red the same way on the Train (ef708196), before #9117 (058294ec), on main's merge base (892427ec), and Leloaloa 80 folds back (e50ed212, the #9435 fold), and on #9597 with the opening-savings fix. No fold of this Train made them red. Seen: the test's own message.

**Cause.** Needs cause. Found so far: the run-time draw breaks the pinned-tests rule. Both towns are in territories, and the test reads full people only, whose opening cash #9597 and the opening-savings fix do not change. Trace who the 19 adults are by person id, and which opening step leaves a territory resident adult with no cash, no account balance and no deposit.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus, medium.

**Rules.** One rule, all 56 places: the test names its towns and seeds in its file and draws none at run time, and a re-pin states the old premise and needs the lead's yes.

**Done when.** The test runs at Leloaloa AS and Tutu VI with the seeds above, written in the file, and the trace names, by person id, the opening step that leaves those adults with nothing, with its fix or its own item. A second session sees in the running game, at a drawn territory town it names with its seed, that resident adults hold cash as the survey's share says.

**Waits on.** Nothing.

**Files.** src/core2/opening-adults-cash.test.ts.
