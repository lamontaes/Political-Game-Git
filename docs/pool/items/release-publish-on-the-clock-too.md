---
id: release-publish-on-the-clock-too
title: "The version commit and publish record are made on the two-hour clock from the newest green main, so merges no longer starve publishing either"
area: release
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/release-publish-clock
pr: #6370
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T18:39:48.621Z
---

**What.** After #6353 the desktop package runs on a clock, but it packages the newest publish record, and publish records come from the per-push Release run, whose build, validate and publish jobs still share the release-main-validate concurrency group: GitHub keeps one pending run and cancels the rest, so with a merge every few minutes no run reaches publish. The first clock run (40554949865, 17:54 UTC Oct 27) found no publish record since the 17:24 merge. Move publishing onto the clock: the scheduled and dispatched Release package workflow first builds and validates the newest main commit whose per-push validation passed (or validates it itself), writes the version commit and publish record, then packages that same candidate. The per-push run keeps validating every merge (so a red main is still seen within minutes) and publishes nothing. Time box: 3 hours.

**Rules.** Release machinery owns version numbers and patch notes; the package step packages exactly the candidate it published (candidateSha and bundleSha256). Never force-push; never delete a run, tag or release. The version commit is still pushed to main by the workflow, with its retry on a non-fast-forward. A release declaration of impact none covers the change.

**Done when.** A scheduled or dispatched Release package run on main, started while two or more merges land during it, builds and validates a candidate, pushes the version commit, writes the publish record and publishes a GitHub release with assets, with the run id, the candidate sha and the merges named in the PR; a push to main still runs validation and goes red on a broken candidate (one run named); no per-push run publishes (the publish job is gone from release.yml or gated off, shown in the diff).

**Files.** .github/workflows/release-package.yml,.github/workflows/release.yml,scripts/release/,docs/release/README.md,tests/release/release-workflow.test.ts

**Notes.** Filed by the CTO Oct 27 18:40 UTC from Fixer R's report on run 40554949865. lead: cto. Read: OWNER-DECISIONS (Oct 27 midday: nothing is held back), DECISION-REGISTER, prior-rulings, LAW; searched docs/pool/items for release-: release-package-on-a-clock-not-every-merge (done, the first half) and release-runs-starved-by-pr-queue (pool flips).
