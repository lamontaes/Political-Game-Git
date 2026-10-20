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
