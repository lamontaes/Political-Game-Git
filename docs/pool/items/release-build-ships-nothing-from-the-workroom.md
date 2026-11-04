---
id: release-build-ships-nothing-from-the-workroom
title: "A packaged build carries nothing from the workroom: no pool, coordination notes, tests, developer routes or dated owner notes"
area: release
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Lane 5's path 10 asks that a Mac build installs and opens with no workroom notes inside. Nothing checks what the packaged app holds: docs, the pool, coordination files, test files, developer-only routes and dated owner notes in code or data could all ship. The early-access checklist (docs/packages/M7-early-access.md line 88, Oct 19) already says dated owner decisions in the game must not ship, and release-audit-07-08 holds the same strip for data citations and stopgap text.

**Rules.** Replace, never layer: one check over the packaged app's own file list, run by the release machinery, not a second packaging path. Estimate, never UNKNOWN does not apply here; the check names each file and line it refuses, so the fix is read from its output.

**Done when.** A script run on the desktop package's staged files (desktop/scripts/stage.mjs output) lists every file under docs, tests and the pool, every developer route the bench serves outside developer mode, and every line matching a dated owner or CTO note, and exits nonzero on any; it runs in the release workflow, and a staged Mac build on main passes it with the count of files checked in the PR.

**Files.** desktop/scripts/stage.mjs, scripts/release, .github/workflows/release-package.yml

**Notes.** TODO
