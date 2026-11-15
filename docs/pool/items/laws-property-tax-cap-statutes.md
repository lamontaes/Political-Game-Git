---
id: laws-property-tax-cap-statutes
title: "Read each state's property-tax cap statute: size, scope, exemptions, reset on sale"
area: laws
kind: research
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr: #5198
blocked-on:
source: "split from laws-stopgap-reach-group-b-faked-mechanic, Oct 16"
claimed-at:
after:
lead: laws-effects
model: sonnet
effort: low
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** A yes-or-no catalog law capping property-tax growth reads each state's cap statute from src/core2/data/laws/property-tax-caps.json, which holds ten states (AR, AZ, CA, FL, MI, NM, NY, OK, OR, TX); every other place takes one generic estimated cap (`propertyTaxGrowthCapShare`), so stopgap SG-GOV-REACH-B-property-tax-bills stays open. Read the remaining states' cap statutes (size, scope, exemptions, reset on sale, levy limits, CPI-lesser terms) as sourced rows, so a named owner's bill follows the place's own terms. This is the one cap-statutes item: laws-property-tax-cap-statutes-rest and the roll-up laws-stopgap-reach-group-b-faked-mechanic are proposed to merge into it. It is split by state group, one group per PR.

**Cause.** Found in code: src/core2/data/laws/property-tax-caps.json lists ten states and src/core2/data/laws/reach-group-b.json (`us-policy-positions:fiscal.cap-property-tax-growth`) applies the generic `propertyTaxGrowthCapShare` to the rest; the stopgap is open in src/core2/data/stopgaps/gov.json.

**Fix.** Do the two parts in order: part 1 reads the assessment limits of the remaining states, part 2 adds levy limits, exemptions, CPI-lesser terms and recorded nones, then closes the stopgap. Source tables failed to fetch on Oct 21; start from the Lincoln Institute database (see Notes).

**Time box.** 2 hours for one Sonnet session, the closing check after the two parts. When it runs out, write what was seen in the item and stop.

**Rules.** Research before building: real law calibrates the terms and never decides one owner's bill. One rule, all 56 places: each place's terms are data with its citation, never logic naming a state. Estimate, never UNKNOWN: a place with no cap statute has none recorded, not a default.

**Done when.** A second session, not the builder, replays this on main: in a drawn place with a cap statute (place and seed named), a one-year played world (buildBenchWorld) shows a named owner's assessment held by the statute's size, with the bill, the notice the owner received and the director's line, by record ids; every place has a cap row or a recorded none; the group B reach test passes and SG-GOV-REACH-B-property-tax-bills is resolved in src/core2/data/stopgaps/gov.json.

**Waits on.** The two parts: laws-property-tax-cap-statutes-part-1-assessment-limit-states, laws-property-tax-cap-statutes-part-2-levy-limits-close.

**Files.** src/core2/data/laws/property-tax-caps.json, src/core2/data/laws/reach-group-b.json, src/core2/law-reach/group-b-money.ts, src/core2/housing-property-tax.ts, src/core2/data/stopgaps/gov.json

**Notes.** Split from laws-stopgap-reach-group-b-faked-mechanic. Take one group of states per PR.

Tried Oct 21 (claude): no state table could be fetched. The Montana legislature's 2020 summary of Lincoln Institute data (archive.legmt.gov/.../property-tax-limits.pdf) gives the types and examples (California the lesser of 2 percent or inflation, Minnesota 15 percent, eighteen states with assessment limits, reset on sale in some, transfer exceptions in California and Florida) but its state-by-state table is check marks that the text layer drops. Lincoln's policy download page states 47 states limit property taxes, 19 with assessment limits in 2024, but the per-state figures sit in the Significant Features of the Property Tax database (lincolninst.edu/research-data/data-toolkits/significant-features-property-tax/topics/property-tax-limits), which would not open. Start from that database (or each state's statute), one group of states per PR. Claim released.

Dropped Nov 14, 2026 (stopgap cluster 15, owner's ruling that the estimate stays as the game's answer): both parts were dropped on Nov 10, so the roll-up has nothing left to wait on. A state with no cap statute row takes the ESTIMATED `propertyTaxGrowthCapShare` (source and spread in reach-group-b-parameters.json); stopgap `SG-GOV-REACH-B-property-tax-bills` and its marker are deleted.
