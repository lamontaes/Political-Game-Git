---
id: gov-outside-revenue-fees-data
title: "What a government's charges and miscellaneous revenue are for, by service and kind, from the Census 2022 item codes"
area: gov
kind: research
priority: 1
size: S
status: done
claimed-by: claude/gov-outside-revenue-fees
pr: #4482
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-15T22:24:46.229Z
---

**What.** For each of the 56 places and for state government and local governments, say what current charges and miscellaneous general revenue are for, from the Census 2022 item codes: education, hospitals, highways, sewerage and solid waste, parks and so on; interest earnings, fines, sales of property, special assessments and so on.

**Rules.** Research before building; one rule, all 56 places; estimate, never UNKNOWN (territories carry the nation's shares tagged ESTIMATED with the spread of the 50 states).

**Done when.** `data/research/money/service-charges-2022.json` covers all 56 places, each tagged SOURCED or ESTIMATED, shares summing to one, totals within a few percent of Census Table 1; a test draws a place and checks it.

**Files.** scripts/research/export-service-charges-2022.py, data/research/money/service-charges-2022.json, data/source/government-finances/census-tables/

**Notes.** Built Oct 15. Feeds `gov-outside-revenue-fees-wiring`.
