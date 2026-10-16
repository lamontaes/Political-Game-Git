---
id: core-stopgap-succession-missing-record
title: "Stopgaps in succession (missing-record): 1 open"
area: core
kind: stopgap
priority: 2
status: done
claimed-by: claude/core-stopgap-succession
pr: #4504
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/succession.ts, kind missing-record"
claimed-at: 2026-10-15T22:54:19.787Z
---

**What.** The stopgap row(s) SG-GOV-succession-qualifications in src/core2/modules/succession.ts mark a shortcut that is still live in play. Today everyone in the line of succession to the presidency is taken to be a natural-born citizen and 14 years a resident, and only the age of 35 is checked. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** No dice: eligibility comes from each person's own birth and residence records and the Constitution's text, never a default. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a successor who fails the citizenship or residency record is skipped, with the person record id and the reason, named by record id. The test in src/core2/succession.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: see the line of succession pass over someone whose records disqualify them.

**Files.** src/core2/modules/succession.ts, src/core2/data/stopgaps.json, src/core2/succession.test.ts

**Notes.** First row: Everyone in the line of succession to the presidency is taken to be a natural-born citizen and 14 years a resident; only the age of 35 is checked.
