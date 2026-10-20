---
id: people-stopgap-opening-schools-estimated-behavior
title: "Stopgaps in opening-schools (estimated-behavior): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (NCES EDGE school attendance boundaries (SABS) with the household's location, private school (PSS) and homeschool shares by state, and historical CCD d...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-schools.json, kind estimated-behavior"
---

**What.** Replace or clear the 1 open estimated-behavior stopgap row(s) in src/core2/data/opening-schools.json: SG-P15-school-assignment. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-schools.json

**Notes.** First row: Each child's school is a seeded pick among the public schools teaching their entry grade in their place, else in their county and its places, else (for places the county geography does not cover: the territories and Puer
