---
id: release-main-runs-cancelled-by-pool-pushes
title: "Every Release run on main is cancelled by the next pool push, so main's state is never known (about 30 in a row on Oct 20)"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Pool claim and status commits push to main every minute or two and each cancels the Release run before it, so no run finishes and a red main cannot be told from a green one. The last run that finished was 8383 (success, 08:26 UTC Oct 20); runs 9297 to 9325 are all cancelled. Let pool-only pushes skip the Release run or stop cancelling the run for the last non-pool commit; see release-skip-pool-only-commits.

**Rules.** Replace, never layer: change the existing concurrency or path filter in .github/workflows/release.yml; no second workflow.

**Done when.** After three pool pushes in a row, the Release run for the last non-pool commit on main still finishes with a result; shown by the run list.

**Files.** .github/workflows/release.yml

**Notes.** TODO
