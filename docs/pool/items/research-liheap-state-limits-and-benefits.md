---
id: research-liheap-state-limits-and-benefits
title: "Source each state's home energy assistance income limit and average benefit"
area: laws
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: stand-in triage Nov 10 (SG-GOV-REACH-B-energy-assistance-enrollment)
after:
lead: researcher
model: sonnet
effort: medium
root: none
---

**What.** Home energy assistance pays every state the statute's 150 percent of the poverty line limit and one national average benefit (stopgap SG-GOV-REACH-B-energy-assistance-enrollment). Each state's own plan sets its limit and benefit. Source them per state.

**Cause.** Found in code: `payEnergyAssistance` in src/core2/law-reach/group-b-money.ts (line 1207, marker in its comment) reads one limit and the FY2014 national average benefit (src/core2/data/laws/reach-group-b-parameters.json line 389); the policy row is at src/core2/data/laws/reach-group-b.json line 333.

**Fix.** Fetch the HHS LIHEAP state plans or the LIHEAP Clearinghouse state tables, quote the pages, and write a per-state table (income limit as percent of poverty or of state median income, average heating benefit, with a spread and citation) under data/research/laws/. Point the payment at the table with the national figure as the estimate for a territory the source lacks. Do not add an application or utility-bill record; that part may stay at early access as a marked estimate.

**Time box.** 4 hours for one Sonnet session at medium effort.

**Rules.** Research before building: real data calibrates, never decides one household's outcome. Estimate, never UNKNOWN. One rule, all 56 places: a per-place table in data, no place named in code.

**Done when.** A second session, not the builder, opens the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose and sees that place's own limit and benefit paid to an eligible household by journal record id, with the table's citation shown on the row.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/data/laws/reach-group-b-parameters.json, src/core2/data/stopgaps/gov.json

**Notes.** Closes the per-state half only; the stand-in stays registered with its whatItFakes narrowed to the missing application and bill.
