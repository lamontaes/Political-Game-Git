---
id: core-stopgap-opening-coworkers-estimated-behavior
title: "Stopgaps in opening-coworkers (estimated-behavior): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Workgroups from occupation and establishment records (BLS OEWS staffing patterns by industry) and a measured number of coworkers known, with time work...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-coworkers.json, kind estimated-behavior"
---

**What.** Replace or clear the 1 open estimated-behavior stopgap row(s) in src/core2/data/opening-coworkers.json: SG-P15-coworker-groups. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-coworkers.json

**Notes.** First row: Residents of the same opening employer are split into seeded balanced workgroups of at most openingCoworkerGroupSize, and each pair knows the other by name since the later of their two start dates. Departments, shifts, e
