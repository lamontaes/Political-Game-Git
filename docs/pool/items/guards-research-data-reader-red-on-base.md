---
id: guards-research-data-reader-red-on-base
title: "The research-data reader guard fails on main for eleven unread files"
area: core
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `tests/guards/research-data-has-reader.test.ts` fails on main at 8911f21ed9: eleven files under `data/research/people/` (the Household Pulse homeschool replicate errors and the contact frequency by tie) and `data/research/stopgaps-oct19/census/` have no reader in `src/` or `scripts/` and no allowlist entry. Every PR that runs the guard sees it red for files it does not touch. Measured by the laws lead in a partial checkout without `art/` and `public/`, which hold no readers.

**Rules.** An effect is a read: wire each file into the code that should use it, or allowlist raw source the game is not meant to read, with a reason. Never weaken the guard.

**Done when.** The guard passes on main: each of the eleven files is read by the code that should use it or listed in `scripts/audit/research-data-allowlist.json` with a reason, and the test run is named in the PR.

**Files.** tests/guards/research-data-has-reader.test.ts, scripts/audit/research-data-allowlist.json

**Notes.** Found while checking the gate for #6070, Oct 25.

Duplicate of release-red-research-reader-census-rerun (Oct 25 audit). Same research-data-has-reader failure.
