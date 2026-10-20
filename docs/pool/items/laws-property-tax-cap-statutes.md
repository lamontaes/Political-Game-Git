---
id: laws-property-tax-cap-statutes
title: "Read each state's property-tax cap statute: size, scope, exemptions, reset on sale"
area: laws
kind: research
priority: 2
size: L
status: in-pr
claimed-by: claude/political-game-pool-l9cym2-e
pr: #5198
blocked-on:
source: "split from laws-stopgap-reach-group-b-faked-mechanic, Oct 16"
claimed-at: 2026-10-19T22:01:14.190Z
---

**What.** A yes or no catalog law about capping property-tax assessments still uses one generic, estimated assessment cap, not the statute (SG-GOV-REACH-B-property-tax-bills). Read each state's cap statute and record its size, what it covers, its exemptions and what resets it on a sale, as sourced rows in the reach data. The assessment and tax bill then apply the place's own terms, and a named owner's bill follows from them. This is research across the states with a cap law, so it is split by state group when claimed.

**Rules.** Research before building: real law calibrates the terms and never decides one owner's bill. One rule, all 56 places: each place's terms are data with its citation, never logic naming a state. Estimate, never UNKNOWN: a place with no cap statute has none recorded, not a default.

**Done when.** In a drawn place with a cap statute (name and seed in the PR body), a one-year played world (buildBenchWorld) shows a named owner's assessment held by the statute's size, the bill, the notice the owner received and the director's line, by record ids; the group B reach test passes and SG-GOV-REACH-B-property-tax-bills is resolved for the states done.

**Files.** src/core2/data/laws/reach-group-b.json, src/core2/law-reach/group-b-money.ts, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-b-faked-mechanic. Take one group of states per PR.
