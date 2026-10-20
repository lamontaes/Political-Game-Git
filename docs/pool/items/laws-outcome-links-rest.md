---
id: laws-outcome-links-rest
title: "Research and build outcome-web links for the 26 laws still in outcome-research-gaps.json"
area: laws
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: laws-outcome-links-unresearched
source: added with npm run pool -- add
---

**What.** PR 5653 built the first of the 27 laws that move no outcome (the state higher-education budget line) and made government measures readable causes in the web. Twenty-six laws remain in src/core2/data/laws/outcome-research-gaps.json, each with the outcome its research would measure. Next in order: the budget lines housing (housing.homelessness) and welfareAndMedicaid (household.poverty-pct), which reuse the budget-line measure pattern in gov-measures.ts; then the amount laws (snap-maximum, income-tax, unemployment-weekly-maximum, medicaid-match), which need a cause that reads the amount in force against the start; lines with no kept outcome (fire, healthAndHospitals, administration) need the outcome produced first.

**Rules.** Research before building: each link cites its source with size and spread, and real rates check totals. An effect is a read: the web reads the law or its measure and the outcome moves for full and counted people alike. No invented numbers; if no source gives a size, say so on the item and leave the row.

**Done when.** For each law built, a link in data/research/outcome-web/links.json moves its measure in a buildBenchWorld played period in a drawn place from all 56, shown by the outcome-web month record id, and the row leaves the gap file.

**Files.** data/research/outcome-web/links.json, src/core2/data/laws/outcome-research-gaps.json, src/core2/gov-measures.ts

**Notes.** TODO
