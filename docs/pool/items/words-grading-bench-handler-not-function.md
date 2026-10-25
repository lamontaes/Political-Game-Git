---
id: words-grading-bench-handler-not-function
title: "The grading bench's saved-world test throws: a law-reach handler is not a function"
area: words
kind: bug
priority: 2
size: S
status: open
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
