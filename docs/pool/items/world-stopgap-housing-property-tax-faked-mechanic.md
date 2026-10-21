---
id: world-stopgap-housing-property-tax-faked-mechanic
title: "Stopgaps in housing-property-tax (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr: #5249
blocked-on: sourced county due dates for all 56 places (research data)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-property-tax.ts, kind faked-mechanic"
claimed-at:
---

**What.** The stopgap row(s) SG-WORLD-property-tax-monthly in src/core2/housing-property-tax.ts mark a shortcut that is still live in play. Today property tax is paid a twelfth each month, as through a mortgage escrow, for every owner. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** Wire to the world: owners pay on the dates their place's law sets. One rule, all 56 places: due dates and installment counts come from each place's data. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), an owner without escrow pays on the place's due dates and the treasury receives it, with the bill and payment record ids, named by record id. The test in src/core2/housing-property-tax.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: own a house and see the tax bill arrive when your town says.

**Files.** src/core2/housing-property-tax.ts, src/core2/data/stopgaps.json, src/core2/housing-property-tax.test.ts

**Notes.** First row: Property tax is paid a twelfth each month, as through a mortgage escrow, for every owner.

Sent back 2026-10-20 from PR #5249 (branch claude/property-tax-billing-g08lgv): Merging current origin/main conflicts in src/core2/housing-property-tax.ts. Resolve that code conflict on this branch and rerun changed-file checks. Preserve the audited Connecticut July 1 / January 1 due dates from main: the body still describes the superseded November/May estimate, so its old played-year trace does not verify the merged data. Update the named non-escrow bill/payment and treasury-receipt proof on the resolved result.; finish on that branch, merge main into it first.
