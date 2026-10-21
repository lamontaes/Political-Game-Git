---
id: laws-property-tax-cap-statutes
title: "Read each state's property-tax cap statute: size, scope, exemptions, reset on sale"
area: laws
kind: research
priority: 2
size: L
status: open
claimed-by:
pr: #5198
blocked-on:
source: "split from laws-stopgap-reach-group-b-faked-mechanic, Oct 16"
claimed-at:
---

**What.** A yes or no catalog law about capping property-tax assessments still uses one generic, estimated assessment cap, not the statute (SG-GOV-REACH-B-property-tax-bills). Read each state's cap statute and record its size, what it covers, its exemptions and what resets it on a sale, as sourced rows in the reach data. The assessment and tax bill then apply the place's own terms, and a named owner's bill follows from them. This is research across the states with a cap law, so it is split by state group when claimed.

**Rules.** Research before building: real law calibrates the terms and never decides one owner's bill. One rule, all 56 places: each place's terms are data with its citation, never logic naming a state. Estimate, never UNKNOWN: a place with no cap statute has none recorded, not a default.

**Done when.** In a drawn place with a cap statute (name and seed in the PR body), a one-year played world (buildBenchWorld) shows a named owner's assessment held by the statute's size, the bill, the notice the owner received and the director's line, by record ids; the group B reach test passes and SG-GOV-REACH-B-property-tax-bills is resolved for the states done.

**Files.** src/core2/data/laws/reach-group-b.json, src/core2/law-reach/group-b-money.ts, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-b-faked-mechanic. Take one group of states per PR.

Tried Oct 21 (claude): no state table could be fetched. The Montana legislature's 2020 summary of Lincoln Institute data (archive.legmt.gov/.../property-tax-limits.pdf) gives the types and examples (California the lesser of 2 percent or inflation, Minnesota 15 percent, eighteen states with assessment limits, reset on sale in some, transfer exceptions in California and Florida) but its state-by-state table is check marks that the text layer drops. Lincoln's policy download page states 47 states limit property taxes, 19 with assessment limits in 2024, but the per-state figures sit in the Significant Features of the Property Tax database (lincolninst.edu/research-data/data-toolkits/significant-features-property-tax/topics/property-tax-limits), which would not open. Start from that database (or each state's statute), one group of states per PR. Claim released.
