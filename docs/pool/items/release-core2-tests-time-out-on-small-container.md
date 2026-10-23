---
id: release-core2-tests-time-out-on-small-container
title: "The groundwater-law played-world test times out at 2 workers on a 4-core container: give it a measured 300-second limit"
area: release
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/core2-test-timeouts
pr: #5344
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T01:49:05.356Z
---

**What.** src/core2/groundwater-law.test.ts runs a drawn farm town's played year and was measured at 156 seconds at two workers on a 4-core container, past its 120-second limit. Raise that one test's limit to 300 seconds (about twice the measured run), with the measurement in a comment beside the limit. The other six tests first listed passed under their own limits when re-measured and keep them.

**Rules.** Speed: the limit follows the measured run and the played year itself must not get slower. One test, one limit, one measured reason in the code. No other timeout changes, no skipped or loosened assertion, no change to what the test plays.

**Done when.** groundwater-law.test.ts has a 300_000 limit with the measured run beside it and passes at two workers on a 4-core container on the merged head; no other test file's limit changes in the PR; the PR title and declaration name one test and 300 seconds.

**Files.** src/core2/groundwater-law.test.ts, docs/release/changes/release-core2-tests-time-out-on-small-container.md

**Notes.** Narrowed from seven tests after the merger asked for a measured reason per increase.

Sent back 2026-10-20 from PR #5344 (branch claude/core2-test-timeouts): merge conflict with main in code; merge main and resolve; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5344 (branch claude/core2-test-timeouts): The body measured only groundwater-law and estate-contracts over their old limits, and explicitly says the other five passed, yet raises paid-leave, housing-laws and income-tax-played to 900 seconds too. The merger check requires a measured reason for each timeout increase. Retain only justified increases or provide each changed test measured need, then run every changed test file on the merged result; the body says four were not rerun.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5344 (branch claude/core2-test-timeouts): Keeping only the measured groundwater timeout addresses the previous unmeasured-increases return. The item still has TODO for What, Rules, Done when and Files, so there is no written acceptance to review, and the body has no required Done when evidence table. Write the bounded groundwater timeout spec with its measured reason and named test acceptance, then map its evidence in the body and retitle the PR from seven tests/900 seconds to the actual one test/300 seconds. A missing gate line alone is not the issue. No local gate pass is claimed here.; finish on that branch, merge main into it first.
