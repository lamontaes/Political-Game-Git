---
id: laws-property-tax-cap-statutes-part-2-levy-limits-close
title: "Levy limits, exemptions and CPI-lesser caps recorded for every place, and the property-tax stopgap closed"
area: laws
kind: research
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: laws-property-tax-cap-statutes-part-1-assessment-limit-states
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: split from laws-property-tax-cap-statutes in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** After part 1 every state with an assessment limit has a row. Finish the table for every state and territory: add levy limits, exemptions and CPI-lesser caps (a cap at the lesser of a fixed percent and inflation) where a statute has them, record "none" for a place with no cap, and close stopgap SG-GOV-REACH-B-property-tax-bills. This is part 2 of laws-property-tax-cap-statutes and absorbs laws-property-tax-cap-statutes-rest.

**Cause.** Found in code: SG-GOV-REACH-B-property-tax-bills is open in src/core2/data/stopgaps/gov.json (it names the missing statutory levy-versus-assessment scope, exemptions and ownership-reset terms); `billPropertyTax` in src/core2/housing-property-tax.ts reads only the ceiling where a statute also limits growth to the CPI change.

**Fix.** Add the levy-limit, exemption and CPI-lesser terms to each row using the term names part 1 set, add a recorded none for every place without a cap, make the assessment read a CPI-lesser cap as the lesser of the two at the bill date, and mark the stopgap resolved.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: every cap cites its statute and is SOURCED, or ESTIMATED with the spread where only a summary was found. One rule, all 56 places: the terms are law-row data with a row for every place that has a cap, and a place without one is recorded as having none. Sliding scales and causes: a CPI-lesser cap moves with the price level, not a fixed number.

**Done when.** A second session, not the builder, plays a one-year world (buildBenchWorld) in a drawn place with a cap on a seed nobody chose and sees a home's bill grow no faster than the cap, by bill record id and law row id, while a place recorded as none grows with the assessment. Every state and territory has a cap row or a recorded none with a citation, src/core2/law-reach-group-b.test.ts passes, and SG-GOV-REACH-B-property-tax-bills is resolved in src/core2/data/stopgaps/gov.json.

**Waits on.** laws-property-tax-cap-statutes-part-1-assessment-limit-states.

**Files.** src/core2/data/laws/property-tax-caps.json, src/core2/housing-property-tax.ts, src/core2/law-reach/group-b-money.ts, src/core2/law-reach-group-b.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): levy limits, exemptions and CPI-lesser terms for every place, to close a stopgap; the part it follows is dropped.
