---
id: words-grading-bench-handler-not-function
title: "The grading bench's saved-world test throws: a law-reach handler is not a function"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6057
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** scripts/dialogue-batch/grading-bench.test.ts 'words every line from pieces and records, profiles change the pieces, and the world is left as it was' fails on clean main (410a5e758c): TypeError 'handler is not a function' in runHandlers (src/core2/law-reach/host.ts:172) while the bench stages a saved world (grading-bench.test.ts:324). Some registered policy handler is not a function after a world is saved and loaded.

**Rules.** Ask why: name the policy key whose handler list holds a non-function and where it was registered before changing the test. One rule, all 56 places.

**Done when.** grading-bench.test.ts passes on main on its own seed and two fresh seeds named in the PR body, with the bad registration named by key and file.

**Files.** scripts/dialogue-batch/grading-bench.test.ts, scripts/dialogue-batch/grading-bench.ts, src/core2/law-reach/host.ts, src/core2/law-reach/group-a.ts

**Notes.** TODO

Sent back 2026-10-25 from PR #6057 (branch words/grading-bench-handler): merging main f99a979bae conflicts in production src/core2/law-reach/group-a.ts; finish on that branch, merge main into it first.

Sent back 2026-10-25 from PR #6057 (branch words/grading-bench-handler): corrected bd4486c449 head now conflicts with current main again in production code src/core2/law-reach/group-a.ts; resolve on the PR branch and rerun integrated grading-bench evidence; finish on that branch, merge main into it first.

Merger 1, 2026-10-26 00:41 UTC correction: the 23:12 conflict return above is withdrawn in PR comment6404725106. This checkout fetched only main by default, leaving the PR ref stale; that attempted merge did not use the bd4486 corrective head it named. Future PR fetches use explicit ref destinations and SHA equality before checkout. Current89d48e955a requires its normal exact-head review after the integration window; no author source repair is requested for that withdrawn conflict. Existing claim/status preserved.

Sent back 2026-10-26 from PR #6057 (branch words/grading-bench-handler): actual corrective head integrates main cleanly, but production tenureYears subtracts year numbers only and says two years for a job only one year and one day old; count completed anniversaries and add boundary regressions, retaining date filter and handler fixes; prior conflict finding stays withdrawn; finish on that branch, merge main into it first.
