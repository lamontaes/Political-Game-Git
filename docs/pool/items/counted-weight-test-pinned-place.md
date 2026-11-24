---
id: counted-weight-test-pinned-place
title: "The counted weight test draws its town at run time and prints no seed, and was red once at 61 weighted people against at most 37.95"
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
model: sonnet
effort: medium
source: "T54's run of the money tests for counted-opening-savings-at-survey-median, Nov 16 02:20Z (Account lead's yes, 02:28Z: a pin item for each run-time draw)"
---

**What.** `src/core2/counted-weight.test.ts` draws its town with `drawPlace(randomBytes(32).toString("hex"), "census-weight")` each run and names no place or seed in its messages. In one run it was red at "expected 60.99999999999997 to be less than 37.949999999999996", the weighted people of a town opened at three times its households against the fit band. The draw cannot be replayed. Seen: the test's own message.

**Cause.** Found in code: src/core2/counted-weight.test.ts:58 draws at run time; the run-time draw breaks the pinned-tests rule, and the assertion's message names no place, so the red cannot be traced. The fault behind 61 against 37.95 needs its own trace once a red place is pinned.

**Fix.** Find by script, outside the test, a place where the weighted read falls outside the band, and one where it holds. Pin both in the test file with their seeds, and put the place and seed in every message. Then trace the red one.

**Time box.** 2 hours, Sonnet, medium.

**Rules.** One rule, all 56 places: the test names its places and seeds in its file, draws none at run time, and a re-pin states the old premise and needs the lead's yes.

**Done when.** The test names its places and seeds in its file and its messages. The red one, if one is found, is traced to the step that reads a counted household at other than its weight, with its fix or its own item. A second session sees in dev mode, at a drawn place it names with its seed opened at three times its households, a counted household read at its weight.

**Waits on.** Nothing.

**Files.** src/core2/counted-weight.test.ts.
