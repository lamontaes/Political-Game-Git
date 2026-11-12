---
id: release-m7-04-part-2-automatic-update
title: "M7-04 part 2: a test update installs itself in the desktop package"
area: release
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: opus
effort: medium
root: none
milestone: M7
source: split from release-m7-04-updates-and-bug-reports in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The desktop package updates itself: a newer build is found, downloaded and installed without the player reinstalling. Updates come through Steam for the launch build (docs/packages/M7-early-access.md); this part makes the package's own updater work and proves it with a test update. desktop/updater.mjs already exists, so start by checking how much of it works.

**Cause.** Design: docs/packages/M7-early-access.md (Updates: a Steam build every night, made in the cloud) and docs/roadmap/later-specs-draft.md section M7-04; desktop/updater.mjs exists and is the starting point.

**Fix.** Read desktop/updater.mjs and its tests, find what is missing between finding a newer build and running it, finish it, and prove it with a test update served locally. Do not start a second updater.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer: finish the existing updater, no parallel one. Look before you ask: read docs/packages/M7-early-access.md and the release machinery in scripts/release before changing the update path.

**Done when.** A second session, on main in the desktop package, serves a newer test build, starts the older package, and sees it find, download and install the update and then open the newer version, with a played world in a drawn place loading after the update. The test in desktop/tests names the old and new versions.

**Waits on.** Nothing in code. Early-access preparation (AGENTS.md: saves and release work wait for it) and the weekly reschedule.

**Files.** desktop/updater.mjs, desktop/main.mjs, desktop/tests, docs/packages/M7-early-access.md

**Notes (depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have made the desktop package install its own updates, but updates come through Steam (docs/packages/M7-early-access.md), so no player sees the package updater.
