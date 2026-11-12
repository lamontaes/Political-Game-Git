---
id: laws-property-tax-cap-statutes-part-1-assessment-limit-states
title: "Property-tax assessment limits read from statute for the states beyond the ten already in the cap table"
area: laws
kind: research
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: split from laws-property-tax-cap-statutes in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** src/core2/data/laws/property-tax-caps.json holds the statutory growth cap on a home's assessed value for ten states (AR, AZ, CA, FL, MI, NM, NY, OK, OR, TX). Every other state takes one generic estimated cap (`propertyTaxGrowthCapShare`), so a named owner's bill there does not follow the statute. Read the cap statute of each remaining state that limits assessment growth (the Lincoln Institute database lists 19 with assessment limits in 2024), and add a sourced row with the cap's size, scope, exemptions and whether it resets on sale. This is part 1 of laws-property-tax-cap-statutes.

**Cause.** Found in code: src/core2/data/laws/property-tax-caps.json lists ten states; the generic cap `propertyTaxGrowthCapShare` applies to the rest in src/core2/data/laws/reach-group-b.json (`us-policy-positions:fiscal.cap-property-tax-growth`), read by `billPropertyTax` in src/core2/housing-property-tax.ts.

**Fix.** Start from the Lincoln Institute "Significant Features of the Property Tax" limits table (lincolninst.edu), then each state's statute; add one row per state in the file's existing format with the statute citation and retrieval date, tagged SOURCED or ESTIMATED with a spread where only a summary was found.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: real law calibrates the terms and never decides one owner's bill. One rule, all 56 places: each place's terms are data with its citation, never logic naming a state. Estimate, never UNKNOWN: a place with no cap statute has none recorded, not a default.

**Done when.** A second session, not the builder, plays a one-year world (buildBenchWorld) in a drawn place whose state is one of the new rows (place and seed named) and sees a named owner's assessment held by the statute's size, with the bill, the notice the owner received and the director's line, by record id. src/core2/law-reach-group-b.test.ts passes and every new row cites its statute.

**Waits on.** Nothing.

**Files.** src/core2/data/laws/property-tax-caps.json, src/core2/housing-property-tax.ts, src/core2/law-reach-group-b.test.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it reads nine more states' assessment-limit statutes; one estimated cap already stands in and a bill card shows a rate, not a statute.
