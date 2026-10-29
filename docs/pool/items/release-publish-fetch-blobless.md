---
id: release-publish-fetch-blobless
title: "The release publish job times out at 5 minutes inside a full depth-1 git fetch of the repository's images"
area: release
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Release package run 40944442277 (dispatched Oct 29 19:55 UTC, candidate 0.66.0 from 32370e08) passed build and validate; its publish job 'Verify the candidate and publish it onto main' (job 123703262800) was canceled at timeout-minutes: 5 in .github/workflows/release-candidate.yml, with orphan git-remote-https processes killed at 20:16:33 after no output since 20:11:22. The step fetches the parent and main's tip with git fetch --depth=1, which downloads the whole tree including images, though the step only compares tree entries, reads blob ids and takes the release files' blobs from the bundle. The previous run's same step took 44 seconds, so a fetch stalls rather than the logic being slow.

**Rules.** Fix at the root, never skip a check. Replace, never layer: the two fetches are changed in place, and no second publish path is added beside the old one. The publish job keeps its write token away from repository code: no checkout, no scripts. The fix changes only how the two fetches transfer objects, plus the job's time limit, and leaves every verification of the candidate in place.

**Done when.** A dispatch of release-package.yml after merge publishes a candidate through the publish job within its limit, shown by the run id and the step's duration in the PR comment, and tests/release/release-workflow.test.ts passes with the changed workflow

**Files.** .github/workflows/release-candidate.yml,tests/release/release-workflow.test.ts

**Notes.** lead: cto. Filed from the CTO's message Oct 29 20:37 UTC by the standing red-main owner. Read: OWNER-DECISIONS (release machinery), searched docs/pool/items for fetch, publish timeout: release-main-red-standing mentions package runs starved by the runner queue (Oct 28), a different cause.
