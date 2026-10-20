---
id: release-core2-tests-time-out-on-small-container
title: "Seven core2 played-world tests time out at 2 workers on a 4-core container: estate-contracts, groundwater-law, housing-laws, income-tax-played, moves-cash, office-proof, paid-leave"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5344
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #5344 (branch claude/core2-test-timeouts): merge conflict with main in code; merge main and resolve; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5344 (branch claude/core2-test-timeouts): The body measured only groundwater-law and estate-contracts over their old limits, and explicitly says the other five passed, yet raises paid-leave, housing-laws and income-tax-played to 900 seconds too. The merger check requires a measured reason for each timeout increase. Retain only justified increases or provide each changed test measured need, then run every changed test file on the merged result; the body says four were not rerun.; finish on that branch, merge main into it first.
