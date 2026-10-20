---
id: people-stopgap-drives-missing-mechanic
title: "Stopgaps in drives (missing-mechanic): 4 open"
area: people
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/drives-unbuilt-acts
pr: #5289
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/drives.json, kind missing-mechanic"
claimed-at: 2026-10-19T23:43:32.982Z
---

**What.** Replace or clear the 4 open missing-mechanic stopgap row(s) in src/core2/data/drives.json: SG-P10-cause-group-founding, SG-P10-testify-unbuilt, SG-P10-candidacy-unbuilt, SG-P10-lobbying-unbuilt. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/drives.json

**Notes.** First row: A resident founds a cause group instantly with no charter, registration, dues or officers.

Oct 19 (claude, claude/drives-unbuilt-acts): the three `unbuilt-system` act rows (testify-at-hearing, run-for-office, lobby-legislator) and their handlers are deleted and `SG-P10-testify-unbuilt`, `SG-P10-candidacy-unbuilt` and `SG-P10-lobbying-unbuilt` resolved: the hearings, candidacy and interest-groups modules already own those routes, so a drive act would be a parallel one. Their bench scene places and figure poses are deleted too. Left for the Words line: the `testify-at-hearing`, `run-for-office` and `lobby-legislator` entries in `data/english/parts/choice-names.json` and `data/content/trait-decisions.json`, which the English engine may use for other scenes. `SG-P10-cause-group-founding` stays open.
