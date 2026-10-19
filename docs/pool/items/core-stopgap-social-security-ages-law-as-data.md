---
id: core-stopgap-social-security-ages-law-as-data
title: "Stopgaps in social-security-ages (law-as-data): 1 open"
area: core
kind: stopgap
priority: 3
status: done
claimed-by: claude/ss-ages-law-in-force
pr: #4503
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/social-security-ages.json, kind law-as-data"
claimed-at: 2026-10-15T22:49:21.322Z
---

**What.** Replace or clear the 1 open law-as-data stopgap row(s) in src/core2/data/social-security-ages.json: SG-CORE-social-security-ages-data. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/social-security-ages.json

**Notes.** First row: Social Security's earliest claim age, full retirement age by birth year and the age-70 end of delayed credits are read from a core data table, not from the law in force.
