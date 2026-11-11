---
id: world-stopgap-housing-property-tax-faked-mechanic
title: "Stopgaps in housing-property-tax (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: dropped
standard: 2
claimed-by:
pr: #5249
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: rc9-place-facts-one-default
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-property-tax.ts, kind faked-mechanic"
claimed-at:
size: S
checked: fable 2026-11-10
---

**What.** Property tax is paid a twelfth each month, as through a mortgage escrow, for every owner, so an owner without escrow never faces the bill dates their place's law sets. The due-date data it waited for has landed: `propertyTaxDueDates` in src/core2/housing-property-tax.ts returns each state's installments and dates. Bill non-escrow owners on those dates and keep the monthly twelfth only for escrow, with the tax reaching the town's treasury. The row stays open until the real mechanic replaces the fake.

**Cause.** Found in code: `billPropertyTax` in src/core2/housing-property-tax.ts (line 122) bills a twelfth each month and calls api.stopgap("SG-WORLD-property-tax-monthly") (line 137, open in src/core2/data/stopgaps/world.json), although `propertyTaxDueDates(usps)` (line 86) now returns each state's installments and due dates.

**Fix.** Bill non-escrow owners on `propertyTaxDueDates` and keep the monthly twelfth only for escrow, then resolve the stopgap row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: owners pay on the dates their place's law sets. One rule, all 56 places: due dates and installment counts come from each place's data. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** A second session, on main in a drawn place (place and seed named in the PR body), plays a year in dev mode and watches an owner without escrow pay on the place's due dates and the treasury receive it, with the bill, payment and treasury receipt record ids. The test in src/core2/housing-property-tax.test.ts and the stopgap tripwire test show SG-WORLD-property-tax-monthly resolved.

**Waits on.** Nothing. The due-date data it waited for has landed; the blocked-on line above is a leftover for the CTO to clear.

**Files.** src/core2/housing-property-tax.ts, src/core2/data/stopgaps/world.json, src/core2/housing-property-tax.test.ts

**Notes.** First row: Property tax is paid a twelfth each month, as through a mortgage escrow, for every owner.

Claude, Oct 19: the replacement needs each county's real due dates and installment counts for all 56 places as sourced data (no such file exists under data/research), plus a mortgage-escrow split. That is a research-data job first (Codex's line); the code change in src/core2/housing-property-tax.ts is small once the data exists.

Sent back 2026-10-20 from PR #5249 (branch claude/property-tax-billing-g08lgv): Merging current origin/main conflicts in src/core2/housing-property-tax.ts. Resolve that code conflict on this branch and rerun changed-file checks. Preserve the audited Connecticut July 1 / January 1 due dates from main: the body still describes the superseded November/May estimate, so its old played-year trace does not verify the merged data. Update the named non-escrow bill/payment and treasury-receipt proof on the resolved result.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5249 (branch claude/property-tax-billing-g08lgv): The conflict and Connecticut-date feedback is addressed, and the body now correctly describes July 1 and January 1. The remaining named proof is still absent: docs/pool/items/world-stopgap-housing-property-tax-faked-mechanic.md:20 requires a non-escrow owner's bill/payment record IDs and the receiving treasury record ID in the one-year drawn-world trace. The body supplies aggregate monthly counts and a seed but no household, bill, payment or treasury receipt IDs. housing-property-tax-played.test.ts:24-46 advances only two days and checks escrow flags, not an actual due-date bill and treasury receipt. Add the explicitly required record chain on the merged result; aggregate counts do not establish that money reached the government. No local gate green is claimed for this missing-proof send-back.; finish on that branch, merge main into it first.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have paid property tax on county due dates instead of monthly; the player sees a yearly tax, not a due date, and it waits on research data for 56 places.
