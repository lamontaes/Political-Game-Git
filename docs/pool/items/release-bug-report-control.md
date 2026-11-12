---
id: release-bug-report-control
title: "Report a bug and the after-crash prompt send a log only when the player presses send"
area: release
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
lead: cto
after:
checked: fable 2026-11-10
---

**What.** Add a Report a bug control to the menu and a prompt after a crash. Each builds a report with the core's bug-report builder (the save, the player's note, the error and the recent record kinds) and sends it only when the player presses send, after showing what would leave the machine. Nothing personal about the player leaves the game. The early-access checklist (owner, Oct 12) asks for exactly this button and prompt. Seen: the Report a bug control in the menu and the prompt after a crash, which show what would be sent (owner, Oct 12 early-access checklist).

**Cause.** Found in code: src/core2/bug-report.ts, function `bugReport` (line 34), builds a `core2-bug-report-v1` report (save, note, error, recent kinds), and `replayBugReport` (line 68) replays it, and src/core2/bug-report.test.ts covers it, but no file under src/bench, src/director or desktop references it, so no screen offers Report a bug or an after-crash prompt.

**Fix.** Add one menu control and one after-crash prompt that build the report with src/core2/bug-report.ts and send it only when the player presses send, showing first what leaves the machine. Use the existing shared screen controls; no second report writer. Until the send endpoint exists, register a stopgap that names the destination.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer: one report writer, the existing one. No hand-written player text: the control's words come from the English engine's banks and show no ids or raw kinds. Screens follow the mocks and the shared controls (screen-to-mock). The player presses send; nothing is sent on its own.

**Done when.** A second session, in the running game in a drawn place, opens the menu, presses Report a bug, sees what would be sent, and sees that nothing leaves until Send is pressed. After a forced thrown error, the next launch offers the same prompt. The report sent is a core2-bug-report-v1 that the loader in src/core2/bug-report.ts replays to the same game date, shown by a test and a screenshot of the prompt.

**Waits on.** release-m7-04-updates-and-bug-reports for the send endpoint; a registered stopgap names the destination until then.

**Files.** src/core2/bug-report.ts, src/core2/bug-report.test.ts, src/bench, desktop/main.mjs, docs/packages/M7-early-access.md

**Notes.** TODO Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.
