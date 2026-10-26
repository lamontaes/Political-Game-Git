---
id: release-apply-enobufs
title: "Release run on main fails: release:apply overflows (ENOBUFS) and runs cancel each other"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: fix/main-red-2026-10-16
pr: #4796
blocked-on:
source: Release workflow on main red Oct 16, 2026 (Build candidate, "Apply and create the candidate commit locally")
---

**What.** The Release workflow on main fails in Build candidate with `release — spawnSync node ENOBUFS` from `npm run release:apply`. `formatWrite` in `scripts/release/apply.ts` pipes each generated file through prettier with `execFileSync` and no `maxBuffer`, so a release file past Node's 1 MiB default kills the step. On top of that, both validate jobs cancel the running run on every new push to main, and with a push every few minutes no run ever finishes. The fix raises the buffer to 64 MiB and makes a newer push wait for the running candidate instead of canceling it.

**Rules.** Red main comes first: nobody builds on a red main for long, and the fix lands at the root; the buffer and the cancel rule are the root, not a retry.

**Done when.** A Release run on main reaches Validate candidate and finishes with a conclusion instead of ENOBUFS or a cancellation; `tests/release/release-workflow.test.ts` still passes with the validate jobs reading `cancel-in-progress: false` and the publish jobs unchanged.

**Files.** `scripts/release/apply.ts`, `.github/workflows/release.yml`, `tests/release/release-workflow.test.ts`.

**Notes.** Fix authored through the GitHub API on branch `fix/main-red-2026-10-16`; the merger runs the changed-file checks before merging.
