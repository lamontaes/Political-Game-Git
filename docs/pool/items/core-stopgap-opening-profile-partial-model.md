---
id: core-stopgap-opening-profile-partial-model
title: "Stopgaps in opening-profile (partial-model): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Attainment from the person's own schooling history (deep past) checked against ACS B15001 by state, age and sex; faith from upbringing and the Pew Rel...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-profile.ts, kind partial-model"
---

**What.** Replace or clear the 1 open partial-model stopgap row(s) in src/core2/opening-profile.ts: SG-P15-opening-profile. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/opening-profile.ts

**Notes.** First row: Each adult's education and faith at the opening, read from their state's CES 2024 shares by age band with a household share; education and faith are treated as independent within a state and age band, and children carry

Looked at Oct 19 (claude/stopgap-rows-notes), not built. The row's replacement has two halves and neither is a small change. Education from the person's own schooling history needs the deep past to record schooling for every adult (the education engine records current enrollment, not a completed history) and ACS B15001 by state, age and sex as the check on totals; faith from upbringing needs the parents' faith on record and the Pew Religious Landscape Study shares, neither of which the kin generator holds. Both are research and data items first; file them as their own pool items before taking this one.
