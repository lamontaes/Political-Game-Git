---
id: play-stopgap-creator-partial-model
title: "Stopgaps in creator (partial-model): 1 open"
area: play
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/bench/creator.ts, kind partial-model"
claimed-at: 2026-10-20T00:43:16.820Z
---

**What.** Replace or clear the 1 open partial-model stopgap row(s) in src/bench/creator.ts: SG-PLAY-creator-age-keeps-past. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/bench/creator.ts

**Notes.** First row: Changing the age in the creator moves only the birth date; the life's generated past (schooling, work, household, family ages) stays as it was drawn for the original age.
