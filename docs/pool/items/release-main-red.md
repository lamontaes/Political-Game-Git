---
id: release-main-red
title: "Main is red: the lane's shared files fail the release declaration check"
area: release
kind: bug
priority: 1
size: S
status: claimed
claimed-by: merger0/recheck-6071-oct26-0154
pr: #6119
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T01:54:16.441Z
---

**What.** Main release run 40255594061 (source 27bc8b1f74da09d580b51719579ab4605afcdf8a) fails declaration enforcement because the play-first lane appends directly to docs/play-first/PROGRESS.md without a release declaration. Its exact incoming range ca33ef650a9933763728d6f3fea976c728ed2c34..27bc8b1f74da09d580b51719579ab4605afcdf8a changes only that status log. The acting CTO reopened this item for that incident on October 25 at 23:40 and supplied PR #6119; the earlier heap incident is already repaired by #6049. Status-only lane writes must not block a client release, while client changes must still carry declarations.

**Rules.** Red main comes first. Exempt only the three status paths named by the CTO: docs/play-first/PROGRESS.md, docs/coordination/LEADS-2026-10-24.md and docs/coordination/MERGE-FIRST.md. Preserve declaration enforcement for client changes, mixed commits, all existing release validation and the measured 5120 MB package/candidate heaps.

**Done when.** The exact failed range above is reproduced as a declaration failure on clean main and passes with the repair in the local environment. Changed release tests pass, including the status-only fixture and workflow path exclusions; ordinary client changes still require declarations. The three named files are excluded from status-only release triggers, mixed client commits still trigger, and the PR body has a Done-when evidence table with the checked head. **On screen.** None by design: status updates no longer block publication of the client.

**Files.** .github/workflows/release.yml, scripts/release/transition.ts, tests/release/declaration-transition.test.ts, tests/release/release-workflow.test.ts, docs/release/changes/release-lane-files-no-declaration.md

**Notes.** Reopened Oct 25 by the speed lead for the package build's heap (run 40205834226, jobs 121208900744 and 121208901649). The earlier candidate-validation heap failure (run 40194542362) was fixed by #6035; the older pool-declaration incident by #5746. Reopened Oct 25 23:40 by the acting CTO for a new red: the release check refused `docs/play-first/PROGRESS.md` changed with no declaration (the lane appends to it straight on main). #6119 exempts that file and the lane's two lead sheets (`LEADS-2026-10-24.md`, `MERGE-FIRST.md`) in the check and in `release.yml` `paths-ignore`, beside the pool. The heap fix (#6049) stays merged.

Merger 2, October 26: aligned the current specification with the CTO's October 25 23:40 reopening for #6119; preserved the prior incident here. Earlier heap incident (resolved by #6049): Main release run 40205834226 (source 122c3217c5, the merge of #5822) validated and published its candidate, then both desktop package jobs failed at "Build the game": Node ran out of its 4 GB heap during typecheck (macOS: `typecheck-test-imports.ts` aborted with exit 134; Windows: "JavaScript heap out of memory"), so the desktop release was never published. #6035 gave candidate validation a measured 5 GB heap, but the package job's own build step still sets `--max-old-space-size=4096`. Until this is fixed no code release reaches the owner's installed build, which every `play-stop-*` item's done-when waits on. Earlier acceptance: The package job's "Build the game" step uses the same measured 5 GB heap as candidate validation; on current main `typecheck-test-imports.ts` fails at 4 GB and both typecheck scripts pass at 5 GB in a local run, with peak memory recorded in the PR; the release workflow test passes; and the PR names the failed run. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.
