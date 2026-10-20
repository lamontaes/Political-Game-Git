---
id: gov-legislative-district-results-missing-states
title: "Fill the state legislative districts the MIT 2024 returns lack (AL, AZ, IN, LA, MD, MS, NJ, VA, WA and others) from each state's own results"
area: gov
kind: research
priority: 3
size: M
status: claimed
claimed-by: claude/practical-planck-vou42i
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:56:33.314Z
---

**What.** The 2024 district-results file (data/research/elections/state-legislative-results-2024.json) covers 41 states; the states absent from the MIT precinct returns still lean to the holder's party at the typical margin. Add their district results from each state's election office (Maryland and Virginia publish them by district) to the same file's shape.

**Rules.** Research calibrates, never decides (research-habit); one rule, all 56 places: a per-district table read by legislativeDistrictShare, no state named in logic; extend scripts/research/compile-legislative-district-results-2024.ts rather than a second reader.

**Done when.** Every state with a 2024 legislative general election has rows; a one-year bench run in a drawn place whose state was missing shows legislativePlace source reading the district's own result; research-data-has-reader guard green.

**Files.** data/research/elections/state-legislative-results-2024.json, scripts/research/compile-legislative-district-results-2024.ts, src/core2/electorate-places.ts

**Notes.** TODO
