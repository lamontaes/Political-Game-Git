---
id: release-main-red
title: "Release candidate typecheck exceeds Node's default heap after the word pack"
area: release
kind: bug
priority: 1
size: S
status: claimed
claimed-by: merger3/release-typecheck-heap-2026-10-25
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T13:08:00.000Z
---

**What.** Main release run 40194542362 failed while validating the exact candidate for source 606e7c44e0. Its build reached typecheck, where Node exhausted its default 4 GB heap and exited 134 before publication. The same current source typecheck passes in this cloud session with a 5 GB heap, so the candidate needs an explicit measured memory allowance rather than a weaker check.

**Rules.** Red main comes first: repair the candidate build before merging unrelated work, preserving the exact-candidate checks and publication boundaries. Replace, never layer: configure the existing validation process rather than adding a second build or bypassing any typecheck project.

**Done when.** The release candidate's existing build and standalone typecheck inherit a 5 GB Node heap. A local build on current main with that setting passes, and the PR records the failed run, measured typecheck evidence, changed-file checks, the release workflow test and a Done-when evidence table without claiming a GitHub badge as its gate.

**Files.** .github/workflows/release.yml, docs/release/changes/release-candidate-typecheck-heap.md

**Notes.** Reopened Oct 25 by Merger 3 for the candidate validation heap failure in run 40194542362 (job 121174320083). The older pool-declaration incident was resolved by #5746. Merger 3 must not merge its own repair PR.
