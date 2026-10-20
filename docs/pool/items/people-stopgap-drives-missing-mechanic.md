---
id: people-stopgap-drives-missing-mechanic
title: "Stopgaps in drives (missing-mechanic): 4 open"
area: people
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/political-game-pool-3xfqef-25
pr: #5289
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/drives.json, kind missing-mechanic"
claimed-at: 2026-10-20T06:32:45.575Z
---

**What.** Replace or clear the 4 open missing-mechanic stopgap row(s) in src/core2/data/drives.json: SG-P10-cause-group-founding, SG-P10-testify-unbuilt, SG-P10-candidacy-unbuilt, SG-P10-lobbying-unbuilt. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/drives.json

**Notes.** First row: A resident founds a cause group instantly with no charter, registration, dues or officers.

SG-P10-testify-unbuilt, SG-P10-candidacy-unbuilt, and SG-P10-lobbying-unbuilt were resolved in PR #5289 by removing the unbuilt act rows and handlers. 1 row remains open (SG-P10-cause-group-founding).


Oct 19 (claude, claude/drives-unbuilt-acts): the three `unbuilt-system` act rows (testify-at-hearing, run-for-office, lobby-legislator) and their handlers are deleted and `SG-P10-testify-unbuilt`, `SG-P10-candidacy-unbuilt` and `SG-P10-lobbying-unbuilt` resolved: the hearings, candidacy and interest-groups modules already own those routes, so a drive act would be a parallel one. Their bench scene places and figure poses are deleted too. Left for the Words line: the `testify-at-hearing`, `run-for-office` and `lobby-legislator` entries in `data/english/parts/choice-names.json` and `data/content/trait-decisions.json`, which the English engine may use for other scenes. `SG-P10-cause-group-founding` stays open.

Looked at Oct 20 (claude/political-game-pool-3xfqef-25), released unbuilt. The one open row, SG-P10-cause-group-founding, says a resident founds a cause group with no charter, registration, dues or officers. A charter, a registration and a filing are real-world steps, and AGENTS.md "This is a game, not a spreadsheet" says they are built only when the golden path needs them, The Political Process has them (`docs/roadmap/political-process-baseline.md` does not list founding paperwork), or the owner asked for them by name; I searched the decision register and OWNER-DECISIONS.md and found no ruling on founding a group. So the question for the owner is whether founding a group should cost anything the player does (dues, officers, a charter) or stay one act; the group's real depth (members who join from their views, a treasury that dues fill, officers who decide) may be the part worth building, and that is `interest-groups` engine work in the government area. Until he answers, the row stays registered as it is.
