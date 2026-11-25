---
id: release-checks-split-fast-and-heavy
title: "The checks split into a fast set and a heavy set, with a guard against a pull request loosening its own checks"
area: release
kind: feature
priority: 1
size: M
status: merged
claimed-by: claude/long-game-split-checks
pr: #9752
after:
blocked-on:
source: the CTO's "how done is proven", rules 1 and 7, on issue 9747 (Nov 16, 2026)
lead: speed
standard: 2
model: fable
effort: medium
root: none
claimed-at: 2026-11-16T23:00:00.000Z
merged-at: 2026-11-17T23:49:11.989Z
---

**What.** No job runs the whole test suite, so nine guard tests and many unit tests never run after they merge. The unit job runs a large change's tests in one job and is canceled at 45 minutes. Nothing stops a pull request from adding an expected-failure mark or a pinned town to pass.
Seen: the run list of a large pull request, where the unit job shows canceled at its 45 minute limit.

**Cause.** Found in code: `.github/workflows/validate.yml`, the `unit` job, runs every changed test file in one job under `timeout-minutes: 45`; no workflow runs `vitest run` over the whole suite; `scripts/guards/index.ts` (`GUARDS`) has no guard that reads what a change adds to test files.

**Fix.** Add the `check-changes` guard to `GUARDS` in `scripts/guards/index.ts`, run from main by a `pull_request_target` workflow. Deal the `unit` job's files over up to six jobs. Add a heavy workflow that runs the whole suite in shards and the 20-year game, nightly and by hand on a branch. The player sees nothing; the CTO sees it on a pull request's checks list.

**Time box.** 4 hours.

**Rules.** One rule, all 56 places: the guard refuses a test newly pinned to a named town or seed. Speed: the heavy set plays the 20-year drawn-place game that the speed bar is read from.

**Done when.** A second session opens a scratch pull request that adds one expected-failure mark and sees the `check-changes` job fail by naming the file, then sees it pass after a CTO line on the crew issue approves that pull request. It starts the heavy workflow by hand on main and reads, on the run summary, every shard finished and the slowest test files; the 20-year job there names its drawn place, for example in a drawn place, Inarajan, Guam (seed 4fdc9dceaa579f83).

**Waits on.** Nothing.

**Files.** scripts/guards/check-changes.mjs, tests/guards/check-changes.json, scripts/guards/check-changes.test.ts, .github/workflows/checks-guard.yml, .github/workflows/heavy.yml, .github/workflows/validate.yml, .github/workflows/twenty-year-nightly.yml, scripts/heavy/suite-times.mjs, docs/design/guards.md

**Notes.** Nine test files under tests/guards have no entry in the guard list and so never run in CI (bring-it-up-lean, current-pointers, day-zero, line-extra, no-private-place-lookup, one-face-one-card, one-list-and-detail-part, person-card-headings, ui-tokens); `scripts/guards/guards.test.ts` is red on main for that and for a missing `scene-pictures` row. Not fixed here.
