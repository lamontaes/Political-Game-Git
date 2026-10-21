---
id: core-stopgap-encounters-behavior-model-gap
title: "Stopgaps in encounters (behavior-model-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5265
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/encounters.json, kind behavior-model-gap"
claimed-at:
---

**What.** Replace or clear the 1 open behavior-model-gap stopgap row(s) in src/core2/data/encounters.json: SG-P15-encounters. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/encounters.json

**Notes.** First row: New people are met only on a visit (the host's household) and on joining a group (its other members); the first tie holds the act's hours. Meetings at an organized meeting wait for attendance, and new coworkers for jobs

Sent back 2026-10-20 from PR #5265 (branch claude/pool-encounters-meetings): The body explicitly leaves SG-P15-encounters open for public-comment/council meetings, neighbors and first-tie-hours evidence. The linked item Done when requires its rows resolved and a one-year played-world downstream read by record id. A town-hall-only unit proof does not complete it. Split the completed bounded town-hall change from the remaining explicit open work, or finish the original acceptance before marking that item done.; finish on that branch, merge main into it first.
