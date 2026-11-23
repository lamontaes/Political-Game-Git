---
id: gov-new-jersey-county-treasurer-assessor-not-elected
title: "A New Jersey ballot lists a county assessor and a county treasurer, which New Jersey counties do not elect"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Owner's Nov 23 sitting, row C12 (docs/coordination/playtest/2026-11-23-1.md, PR #10292)"
checked:
claimed-at:
---

**What.** In a New Jersey town the Elections tab's "Also on your ballot" lists County assessor and County treasurer for the county. New Jersey elects neither: its counties elect a clerk, a sheriff and a surrogate, and the board of commissioners appoints the treasurer. The player reads a ballot that asks them to vote for offices that do not exist there, which breaks the sense of a real place. Seen: Politics, Elections, "Also on your ballot", in a New Jersey town.

**Cause.** Found in code: data/research/government/county-row-offices-by-state.json has a New Jersey row for only the prosecutor and the coroner, so the treasurer and the assessor take the common default, elected (read by the function countyRowOfficeRule in src/core2/gov-rules/county-row-offices.ts, line 70). Measured: Allamuchy, New Jersey, seed r1, main 7f04c334.

**Fix.** Add the treasurer (appointed by the board of county commissioners, N.J.S.A. 40A:9-27, read) and the assessor (not a county office; estimated, marked not yet read) to the New Jersey row. Still open: the commissioner board's "District 1" seats, where Hunterdon elects its commissioners at large (county-election-schedule-by-state.json, offices-local.ts boardOffices).

**Time box.** 1 hour for the data row.

**Rules.** One rule, all 56 places: the fix is a data row. Research before building: the source is in the row's note.

**Done when.** A second session starts a new life in a drawn New Jersey place on main (named with its seed), opens Politics, Elections in the screenshot and finds no county assessor or treasurer under "Also on your ballot", while the county clerk and sheriff remain.

**Waits on.** Nothing.

**Files.** data/research/government/county-row-offices-by-state.json
