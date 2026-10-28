---
id: release-package-on-a-clock-not-every-merge
title: "The desktop package builds on a two-hour clock or on request, not on every merge, so merges never starve the owner's build"
area: release
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/release-package-clock
pr: #6353
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T16:41:25.359Z
---

**What.** Every merge to main starts a Release run that builds, validates, publishes and then packages the Mac and Windows desktop apps; the publish and package jobs share one concurrency group and GitHub keeps only the newest pending run, so on the morning of Oct 27 twelve runs in a row were superseded before they packaged and the owner had no new build for five hours (v0.47.1 at 08:09 UTC to v0.51.1 at 10:19, then nothing until 15:40). The CTO answered with merge holds, which the owner has withdrawn: nothing is held back. Split the workflow: every push to main still builds and validates the candidate and publishes the version commit (fast, minutes), but packaging the desktop apps runs on a schedule every two hours against the newest published candidate, and on workflow_dispatch when the CTO or the owner asks, never canceled or superseded by a merge. Time box: 3 hours.

**Rules.** Release machinery owns version numbers and patch notes; the package step must package exactly the candidate the ledger published (the candidateSha and bundleSha256 in the publish record), never a newer main. Never force-push; never permanently delete a run or a release. The smoke test (desktop/scripts/smoke-test.mjs) runs unchanged. A release declaration of impact none covers the workflow change.

**Done when.** A run of the scheduled package job on main produces a GitHub release with seven assets for the newest published candidate while two or more merges land during its run and none cancels or supersedes it (name the run ids and the merges); a workflow_dispatch of the package job does the same on request; the validate path on a push to main still finishes in under 15 minutes and still fails a red candidate (name one run of each); docs/release/README or the workflow header says when builds happen and how to ask for one.

**Files.** .github/workflows/release.yml,scripts/release/,docs/release/

**Notes.** Filed by the CTO Oct 27 17:05 UTC on the owner's word (12:55 PM Eastern: do number two). lead: cto. Read: OWNER-DECISIONS (Oct 27 midday), DECISION-REGISTER, prior-rulings, LAW; searched docs/pool/items for release-runs-starved-by-pr-queue (exists, about pool flips, not packaging) and release-: no twin.
