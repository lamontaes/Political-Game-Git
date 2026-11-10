---
id: release-m7-04-updates-and-bug-reports
title: "M7-04 Updates and bug reports"
area: release
kind: feature
priority: 3
size: L
status: blocked
claimed-by:
pr:
blocked-on: release-m7-04-part-1-crash-report-capture, release-m7-04-part-2-automatic-update, release-m7-04-part-3-content-update, release-bug-report-control
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-04"
claimed-at:
standard: 2
model: opus
effort: medium
root: none
lead: cto
after:
---

**What.** Roadmap M7-04: automatic updates, content updates without a reinstall, in-game bug reports with logs, and crash reports. Early access needs a test update that installs itself and a bug report that arrives with its log. It is too large for one session, so it is split into the parts named in Waits on; the bug-report button and the after-crash prompt are the separate item release-bug-report-control, and desktop/updater.mjs already exists, so each part starts by checking how much is built.

**Cause.** Design: docs/roadmap/later-specs-draft.md section M7-04 (approved by the owner Oct 12) and docs/packages/M7-early-access.md.

**Fix.** Automatic updates, content updates, in-game bug reports with logs, crash reports. Take the parts below one at a time once early-access preparation starts; this parent closes when each part and release-bug-report-control are done.

**Time box.** 16 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Spec approved by the owner Oct 12. Replace, never layer: the updater, the bug report and the crash capture each build on what desktop/updater.mjs and src/core2/bug-report.ts already hold. Look before you ask: read docs/packages/M7-early-access.md first.

**Done when.** A second session, in the desktop package on main, sees a test update install itself, a data-only update change a game table without a reinstall, a thrown error in a played world in a drawn place leave a report the next launch offers to send, and a bug report arrive with its log. Each of the parts below records its own evidence.

**Waits on.** Its parts: release-m7-04-part-1-crash-report-capture, release-m7-04-part-2-automatic-update, release-m7-04-part-3-content-update, and the item release-bug-report-control. Early-access preparation (AGENTS.md: saves and release work wait for it) and the weekly reschedule.

**Files.** docs/roadmap/later-specs-draft.md, docs/packages/M7-early-access.md, desktop/updater.mjs, src/core2/bug-report.ts

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.
