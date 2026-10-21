---
id: play-stopgap-controls-text
title: "Stopgaps in controls (text): 1 open"
area: play
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/bench/data/controls.json, kind text"
claimed-at: 2026-10-20T00:40:20.177Z
---

**What.** Replace or clear the 1 open text stopgap row(s) in src/bench/data/controls.json: SG-PLAY-act-control-names. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/bench/data/controls.json

**Notes.** First row: Where OPUS-WORDS' mined bank has no name for an act yet (care for a relative, join an association, hold a meeting, visit an office), the play screen names its choice button from a bench table of control names (“Look afte
