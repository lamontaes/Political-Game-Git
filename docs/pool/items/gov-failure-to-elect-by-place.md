---
id: gov-failure-to-elect-by-place
title: "When an election fails to fill an office, the holdover and repeat election follow each place's own law"
area: gov
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/modules/voting.ts uses a family estimate (src/core2/data/offices/holdover.json) for what happens when no one is elected, because no place has a researched failure-to-elect row; national presidential failure-to-elect is not built. Research each of the 56 places' rule per office family (holdover, appointment or repeat election and its timing), cite it, and read it in the same function; add the national contingent election path (House by state delegation, Senate for vice president). Closes SG-GOV-empty-race-law.

**Rules.** Research before building: each row cites statute or constitution. One rule, all 56 places: rules live in data per place and office family. The chain is the acceptance: an empty race leads to a recorded holdover or a dated repeat election.

**Done when.** Data rows exist for all 56 places with citations, a test in src/core2/modules/voting.test.ts checks one place's holdover and one place's repeat election date, and a one-year played world (buildBenchWorld, drawn place and seed named) with an uncontested-and-empty race shows the holdover record by id.

**Files.** src/core2/modules/voting.ts, src/core2/data/offices/holdover.json, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-empty-race-law.
