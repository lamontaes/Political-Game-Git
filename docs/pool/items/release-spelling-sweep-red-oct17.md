---
id: release-spelling-sweep-red-oct17
title: "american-english tests fail on main: British forms in docs, tests, a workflow comment and two English data names"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by:
pr: #4957
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The two American English tests failed on main on October 17. They found 14 British forms in docs, tests and a workflow comment, the British word "authority" in two English data names ("local authority"), and a FEMA incident name, "Sulphur Fire", that the sweep flagged though it is a fetched source name. Pull request 4957 respells the forms, exempts the FEMA data file as fetched source, and removes a duplicate pool item whose own id was British.

**Rules.** American English everywhere: the sweep stays strict, and only fetched source data is exempt, with its file named. Persisted identifiers keep their spelling.

**Done when.** `npm run spelling` lists nothing and `tests/american-english-sweep.test.ts` and the second English test pass on clean main (test output in the pull request), with the two bill names reading "broader local government power" and "more local government power".

**Files.** tests/american-english-sweep.test.ts, data/english/bill-sections.json, data/english/question-names.json

**Notes.** Body repaired Oct 17 (claude) from the pull request's description; the fix is in that pull request.
