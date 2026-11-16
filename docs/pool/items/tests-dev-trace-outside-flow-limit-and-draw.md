---
id: tests-dev-trace-outside-flow-limit-and-draw
title: "The dev trace outside-flow test draws a new place each run and runs 13 to 42 seconds under vitest's 30-second default"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: renters
source: story builder thread, Nov 16, the Account lead's ask on #9614
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The dev trace test on an outside buyers' flow draws a new place every run and keeps vitest's 30-second default limit. Alone it takes 13 to 26 seconds by draw; beside three other world tests it took 23 to 42 seconds, so it fails by draw and by load. Seen: red once beside others at Westerly, Rhode Island, green alone on the same code.

**Cause.** Measured: by `npx vitest run src/bench/dev-trace-outside-flow.test.ts --reporter=verbose` on Train ef708196 alone 25.9 s and 20.6 s (Livingston, Jarales), beside printed-words, dev-trace-every-id and dev-state-trace 23.1 s (Elkhorn City); on #9614 at 0ff87656 alone 19.8 s and 13.1 s (Hopkinton, Flatwoods), beside 41.9 s, red at the 30 s default (Westerly, Rhode Island), and again beside at 0ff87656 42.9 s, red (Woodland, Washington, seed 61c7cf2ff1aba6c0), each with its own drawn seed. Found in code: src/bench/dev-trace-outside-flow.test.ts line 20 draws its seed with `randomBytes` unless `DEV_TRACE_SEED` is set, and the test sets no timeout.

**Fix.** Pin the test to named places with fixed seeds (skill `pinned-tests`), found by a script outside the test, and set its limit near twice the slower of its alone and beside times at those places.

**Time box.** 1 hour.

**Rules.** One rule, all 56 places: the pinned places are named in the test, never in logic.

**Done when.** A second session runs the pinned test alone and beside the same three tests, twice each, and it is green each time, at a drawn place it names with its seed (such as Westerly, Rhode Island).

**Waits on.** Nothing.

**Files.** src/bench/dev-trace-outside-flow.test.ts
