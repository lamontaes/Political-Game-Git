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

Checked Oct 15 by a Claude session. The release side is right: release.yml requires latest-mac.yml before it publishes, uploads every packaged file to a draft and then publishes it as the latest release. The live v0.7.0 release is marked latest and carries latest-mac.yml, latest.yml, the dmg, the zip and both blockmaps; latest-mac.yml names OurCivicDuty-0.7.0-mac-arm64.zip with the same size (691509502) as the uploaded zip. The updater's decisions (version compare, downgrade and channel refusal) are covered by desktop/tests/updater.test.mjs. What cannot be checked from a cloud session is the installed Mac app moving from one release to the next: only one release exists, and the swap needs the owner's Mac. When v0.7.1 publishes, the owner (or a checker on the Mac) installs v0.7.0, presses Check for updates and confirms it offers and installs v0.7.1.
