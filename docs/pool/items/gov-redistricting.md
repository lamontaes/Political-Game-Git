---
id: gov-redistricting
title: "Redistricting after the census: someone draws the district lines, and independent redistricting changes who"
area: gov
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from laws-family-government-operations; stopgap SG-GOV-REACH-A-redistricting"
---

**What.** Districts are labels on seats. Add a redistricting step after each census that draws a legislature's districts from the place's counted and named residents (equal population, contiguity from the county and tract data the place files hold), run by the body that holds the power in that state (the legislature, a commission or a court) with its own interests; the independent-redistricting law moves the power to a commission and the next election's districts follow.

**Rules.** No dice; one rule, all 56 places; an effect is a read (the next election's candidates, voters and results read the lines); read the register before asking the owner anything on gerrymandering.

**Done when.** In a drawn place with a census, a named voter is placed in a district by the drawn lines, a different body draws them when the law changes, and the next race uses them, by record id.

**Files.** `src/core2/modules/elections.ts`, `src/core2/offices-state.ts`, a new districting module, `src/core2/data/`.

**Notes.** The Political Process baseline (`docs/roadmap/political-process-baseline.md`) says what it does here; read it first.
