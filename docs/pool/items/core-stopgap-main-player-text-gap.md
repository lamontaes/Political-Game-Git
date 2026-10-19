---
id: core-stopgap-main-player-text-gap
title: "Stopgaps in main (player-text-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, desktop/main.mjs, kind player-text-gap"
---

**What.** Replace or clear the 1 open player-text-gap stopgap row(s) in desktop/main.mjs: SG-PLAY-desktop-update-dialog-text. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** desktop/main.mjs

**Notes.** First row: The desktop shell's update dialogs (Check for Updates, and the Mac note on what installing does) are written in the shell, not by the English engine.
