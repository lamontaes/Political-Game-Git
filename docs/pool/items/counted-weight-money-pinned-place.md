---
id: counted-weight-money-pinned-place
title: "The counted weight-money test draws its town at run time, and a retirement contribution moves 1.037 times its weight at Keysville"
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

**What.** `src/core2/counted-weight-money.test.ts` draws its town from `randomBytes` at run time. In the #9597 run it drew Keysville GA (1343360, seed 866de0a3842fb7b6a9d70020e8b1f4e70b3659e1dda76c9093e5c59e81a2baf0) and failed at `residents:retirement:opening-retirement-contributor:41f4ced694a821ab|2025-02-01|1`: "expected 1.0368 to be 1", a payment at ten times the weight that is not ten times the payment. Replayed with `CWM_SEED` and `CWM_KEY` it is red the same way on the Train (ef708196), before #9117 (058294ec), on main's merge base (892427ec) and 80 folds back (e50ed212, the #9435 fold), and on #9597 with the opening-savings fix. So no fold of this Train made it red; it was red there already and no draw caught it. Seen: the test's own message.

**Cause.** Needs cause. Found so far: the run-time draw breaks the pinned-tests rule. The retirement-contributor flow's first payment in a world opened at ten times the weight is 1.037 times the sample world's, not exactly ten times. Trace which part of that flow (the contribution's base, its rounding, or a share read from the group) does not scale with the weight.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus, medium.

**Rules.** One rule, all 56 places: the test names its town and seed in its file and draws none at run time, and a re-pin states the old premise and needs the lead's yes.

**Done when.** The test runs at Keysville GA with the seed above, written in the file, and the trace names the step of the retirement-contributor flow that does not scale with the weight, with its fix or its own item. A second session sees in dev mode, at a drawn place it names with its seed opened at its Census size, a counted retirement contribution paid at its weight times the one-household amount.

**Waits on.** Nothing.

**Files.** src/core2/counted-weight-money.test.ts.
