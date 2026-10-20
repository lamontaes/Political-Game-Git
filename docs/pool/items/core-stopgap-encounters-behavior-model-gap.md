---
id: core-stopgap-encounters-behavior-model-gap
title: "Stopgaps in encounters (behavior-model-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/pool-encounters-meetings
pr: #5265
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/encounters.json, kind behavior-model-gap"
claimed-at: 2026-10-19T23:17:13.826Z
---

**What.** Replace or clear the 1 open behavior-model-gap stopgap row(s) in src/core2/data/encounters.json: SG-P15-encounters. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/encounters.json

**Notes.** First row: New people are met only on a visit (the host's household) and on joining a group (its other members); the first tie holds the act's hours. Meetings at an organized meeting wait for attendance, and new coworkers for jobs

Oct 19 (claude): town-hall attendees now meet the host (`meetAtMeeting`, cause `met-at-meeting`, civic hours); coworkers on a new job were already wired (`meetAtWork` in jobs). Row narrowed, not closed: neighbors wait for addresses (`world-dwelling-locations`) and attendees meeting each other waits for seating.
