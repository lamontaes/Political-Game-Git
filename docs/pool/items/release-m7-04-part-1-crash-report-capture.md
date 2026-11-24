---
id: release-m7-04-part-1-crash-report-capture
title: "M7-04 part 1: a thrown error in play writes a crash report the next launch offers to send"
area: release
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: sonnet
effort: medium
root: none
milestone: M7
source: split from release-m7-04-updates-and-bug-reports in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** When the game throws an error during play, it writes a crash report (the save, the error and the recent record kinds, using the existing bug-report builder) to disk, and the next launch offers to send it. The send itself, and the button and prompt screens, belong to release-bug-report-control.

**Cause.** Found in code: src/core2/bug-report.ts, function `bugReport` (line 34), builds a `core2-bug-report-v1` report with an error field, but nothing catches a thrown error in play and writes it to disk.

**Fix.** Catch an uncaught error in the played game (the desktop main process and the bench), write a report with the existing builder to the player's data folder, and expose it to the after-crash prompt that release-bug-report-control builds. No second report writer.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer: one report writer, the existing one. Nothing personal about the player is written beyond what the report format holds. A test asserts the feature and fails when no report is written.

**Done when.** A second session forces a thrown error in a played world in a drawn place (name the place and seed), closes the game, relaunches, and finds a core2-bug-report-v1 file written for that error that the loader in src/core2/bug-report.ts replays to the same game date, shown by a test and the report's record id.

**Waits on.** release-bug-report-control for the prompt that offers the report. Early-access preparation (AGENTS.md: saves and release work wait for it) and the weekly reschedule.

**Files.** src/core2/bug-report.ts, src/core2/bug-report.test.ts, desktop/main.mjs
