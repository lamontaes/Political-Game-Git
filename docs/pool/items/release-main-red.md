---
id: release-main-red
title: "Main is red: the lane's shared files fail the release declaration check"
area: release
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: cto-release-lane-files-no-declaration
pr: #6119
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T23:42:13.390Z
---

**What.** Main release run 40205834226 (source 122c3217c5, the merge of #5822) validated and published its candidate, then both desktop package jobs failed at "Build the game": Node ran out of its 4 GB heap during typecheck (macOS: `typecheck-test-imports.ts` aborted with exit 134; Windows: "JavaScript heap out of memory"), so the desktop release was never published. #6035 gave candidate validation a measured 5 GB heap, but the package job's own build step still sets `--max-old-space-size=4096`. Until this is fixed no code release reaches the owner's installed build, which every `play-stop-*` item's done-when waits on.

**Rules.** Red main comes first: repair the package build at its root, keeping every check it runs. Replace, never layer: change the existing step's heap setting; add no second build and skip no typecheck project.

**Done when.** The package job's "Build the game" step uses the same measured 5 GB heap as candidate validation; on current main `typecheck-test-imports.ts` fails at 4 GB and both typecheck scripts pass at 5 GB in a local run, with peak memory recorded in the PR; the release workflow test passes; and the PR names the failed run.

**Files.** .github/workflows/release.yml, docs/release/changes/release-package-build-heap.md

**Notes.** Reopened Oct 25 by the speed lead for the package build's heap (run 40205834226, jobs 121208900744 and 121208901649). The earlier candidate-validation heap failure (run 40194542362) was fixed by #6035; the older pool-declaration incident by #5746. Reopened Oct 25 23:40 by the acting CTO for a new red: the release check refused `docs/play-first/PROGRESS.md` changed with no declaration (the lane appends to it straight on main). #6119 exempts that file and the lane's two lead sheets (`LEADS-2026-10-24.md`, `MERGE-FIRST.md`) in the check and in `release.yml` `paths-ignore`, beside the pool. The heap fix (#6049) stays merged.
