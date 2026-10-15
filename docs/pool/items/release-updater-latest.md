---
id: release-updater-latest
title: "Check for updates in the installed Mac app finds the newest release"
area: release
kind: bug
priority: 2
status: blocked
claimed-by:
pr:
blocked-on: a second release (v0.7.1 or later) to update to
milestone:
source: 'astra order 2 "Owner plays it"; windows-package stopgap'
---

**What.** The release gate is client-only (build, typecheck, release declarations). Make sure every release publishes latest.yml and that Check for updates finds the newest release.

**Rules.** impact declarations per release machinery.

**Done when.** Installed Mac app updates from one release to the next.

**Files.** .github/workflows/release.yml

**Notes.** Order 2 PR #4316 merged; verify end to end.
