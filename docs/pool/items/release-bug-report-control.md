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
---

**What.** The shipped game has no "Report a bug" control and no after-crash prompt. Add both: a control in the options screen and a prompt on the next start after a crash, each showing what would be sent (the game's log) and sending it only when the player presses send. Nothing is sent otherwise.

**Rules.** No hand-written player text: the control names are in `src/bench/data/controls.json` and any sentence comes from the English engine. Saves and logs stay on the player's machine until they press send.

**Done when.** A test in a drawn place opens the report control, shows the log it would send, and shows that nothing leaves the machine until send is pressed; a simulated crash shows the prompt on the next start.

**Files.** desktop/main.mjs, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Found while checking release-m7-04-updates-and-bug-reports: no such control exists in src/bench or desktop.
