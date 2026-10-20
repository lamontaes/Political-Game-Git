---
id: tests-world-builds-hit-default-timeout
title: "Three tests that build a whole world time out in a busy run: they keep the 30-second default"
area: core
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/slow-world-test-timeouts
pr: #5335
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:37:53.880Z
---

**What.** In the full unit run on main, scandal-term, law-enacted-over-scheduled and consumer-credit-law failed with "Test timed out" at 30, 30 and 120 seconds while many worlds were building at once. Each passes alone in normal time. Their neighbors that build a whole world set their own timeouts; these three kept the 30-second default or a short one.

**Rules.** Local gate: the fix is the explicit timeout the other world-building tests already use, nothing more. No dice and the assertions are untouched.

**Done when.** The three test files pass together in one run on a busy machine (src/core2/scandal-term.test.ts, law-enacted-over-scheduled.test.ts, consumer-credit-law.test.ts), each in its drawn place and seed, as they failed together before.

**Files.** src/core2/scandal-term.test.ts, src/core2/law-enacted-over-scheduled.test.ts, src/core2/consumer-credit-law.test.ts

**Notes.** Found by running the full unit suite on main on Oct 19 (12 failures in 3,932 tests). A better fix may be to put world-building tests in one slow project; this keeps to the existing pattern.
