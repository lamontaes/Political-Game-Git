---
id: gov-dual-office-law-by-place
title: "Which two offices one person may hold at once is read from each place's law, not one estimate"
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

**What.** src/core2/office-incompatibility.ts treats any two elected mandates as incompatible because no per-place dual-office compilation exists. Compile each of the 56 places' constitutional and statutory dual-office prohibitions and exceptions (for example a state legislator who may also sit on a local school board), cite each by section, and replace the estimated pairs in the same reader. Places whose law is not found keep the conservative rule with a spread note.

**Rules.** Research before building: each prohibition is cited by statute or constitution section with its retrieval date. One rule, all 56 places: the pairs live in data per place, never in logic.

**Done when.** The data holds a cited row for each of the 56 places, the reader uses it, src/core2/office-incompatibility.test.ts checks one place where a pair is allowed and one where it is barred, and a one-year played world (buildBenchWorld, drawn place and seed named) shows an officeholder elected to a second office keeping or vacating the first by record id.

**Files.** src/core2/office-incompatibility.ts, src/core2/office-incompatibility.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-dual-office-law; the earlier research endpoint was blocked by a firewall.
