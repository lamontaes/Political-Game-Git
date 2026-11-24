---
id: macro-outlook-test-pinned-seed
title: "The macro outlook test draws a random seed each run, and the outlook and the lived months part by about 0.06 points of unemployment in January 2028"
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
source: "T54's run of the money tests for counted-opening-savings-at-survey-median, Nov 16 02:20Z, red on #9597 too (Account lead's yes, 02:28Z: a pin item for each run-time draw)"
---

**What.** `src/core2/macro.test.ts` > "the outlook is the months the game then lives, and it writes nothing" draws its seed from `Math.random()` each run. It was red at seed outlook-srhdq875 (3.0117 against 2.9529 in 2028-01) on the opening-savings branch. It was also red at seed outlook-qvrxtrz2 (3.4104 against 3.3525 in 2028-01) on #9597 (db5c3f8a) without that branch. Both differ by about 0.06 points of unemployment, against a tolerance of 5e-7. Seen: the test's own message.

**Cause.** Needs cause. Found so far: the run-time draw breaks the pinned-tests rule. The outlook (`countryOutlook`) and the months the game then lives agree until late 2027 and part in January 2028 at both seeds, so something the lived months read that the outlook does not starts to move by then.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus, medium.

**Rules.** One rule, all 56 places: the seeds above are written in the file, no seed is drawn at run time, and a re-pin states the old premise and needs the lead's yes.

**Done when.** The test runs at outlook-srhdq875 and outlook-qvrxtrz2, written in the file. The trace names the input the lived January 2028 reads that the outlook leaves out, with its fix or its own item. A second session sees in dev mode, at a drawn place it names with its seed, the outlook's unemployment and the lived month's agree.

**Waits on.** Nothing.

**Files.** src/core2/macro.test.ts.
