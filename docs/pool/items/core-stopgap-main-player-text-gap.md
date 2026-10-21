---
id: core-stopgap-main-player-text-gap
title: "Stopgaps in main (player-text-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5251
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, desktop/main.mjs, kind player-text-gap"
claimed-at:
---

**What.** Replace or clear the 1 open player-text-gap stopgap row(s) in desktop/main.mjs: SG-PLAY-desktop-update-dialog-text. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** desktop/main.mjs

**Notes.** First row: The desktop shell's update dialogs (Check for Updates, and the Mac note on what installing does) are written in the shell, not by the English engine.

Looked at Oct 19 (claude/stopgap-rows-notes), not built. The row is one sentence in `desktop/main.mjs` (`installNote`, shown on a Mac update: "When you quit, the new version replaces this one in the same folder and opens. Your saves stay where they are."), a dialog the owner ordered on Oct 14. Replacing it means shipping an English-engine bank beside the client for the shell to read, which has to be built and checked in the packaged Electron app; this container cannot run it. The owner may prefer to close the row as an accepted shell string; that is his call, so I did not guess.

Sent back 2026-10-20 from PR #5251 (branch claude/desktop-update-text): data/english/parts/shell.json adds 19 entries with origin authored and shippable true. The morning check forbids authored bank text shipping before grading. Keep these entries held until graded, update the claimed shipped behavior accordingly, and have the Words session own the data/english changes.; finish on that branch, merge main into it first.
