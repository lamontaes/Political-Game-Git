# Adopted tax terms now have a validated consumer

The new binder converts declared adopted terms into the existing typed levy contract and validates its saved public recipient. Eight controlled checks passed. The production numeric query is used directly. The shared category query is still absent, so a normal call returns unavailable until the coordinator supplies it. This slice changes no liabilities, payments or saved records and does not establish tax activation.

## Merged

The tax handler and registration are on main. This consumer is a separate draft built from main `8c44a3d24f9808962a839bc035bbcfdb009d1aa9`. Its only production ownership is `src/simulation/tax-law-term-binding.ts`; the paired focused test is also owned by Team6. Shared queries, catalog, tax types, assessment and collection writers are unchanged.

## What emerged

HARDWIRED — `bindTaxLawTerms` reads all five published numeric keys using the canonical adopted-text query. It requires explicit series, base, exemption and recipient categories from the shared query dependency. It checks the exact acquired power, operative law, saved proposal, government identity and organization profile.

HARDWIRED — a controlled saved-record fixture returned the existing typed proposal terms and recipient identity. Repeat calls left the fixture byte-identical. The actual numeric query read authored adopted sections; the category callback supplied explicit controlled query results. This does not prove that a production category query exists or that a natural law reached a payer.

HARDWIRED — missing categories, wrong units, conflicting sections, absent exemptions, ambiguous or mismatched recipients, missing or closed public organizations, unsupported power and changed frozen terms returned unavailable. An explicitly adopted zero rate remained zero. Retained assessment and collection records were unchanged in every tested case.

No person's decision or new tax payment was simulated in these conversion checks.

## Connections

The binder returns existing `TaxTerms`, proposal ID, exact saved public organization/government identity and source IDs. Metadata comes from the already saved typed proposal; numeric and categorical fields cannot fall back to catalog labels or generated defaults. Terms must still match that frozen proposal.

The admitted tax handler continues to own application through the sole assessment writer. Due-date collection remains separate. This module has no writer, clock hook, tax calculator, collection path or liability override.

## Missing links

The exported `ReadAdoptedTaxCategory` callback is an explicit dependency, not a replacement query. Without it, the binder refuses to bind. It also refuses historical date/cutoff reads because the current numeric query does not accept those arguments. Starting-law proposal binding remains unsupported.

The coordinator's required reader signatures are `readFinalEnactedLawTerm(world, law, {questionKey, termKey, unit, onDate, cutoff})` and `readFinalEnactedLawCategory(world, law, {questionKey, termKey, onDate, cutoff})`. The category result must carry values, measure ID, provision ID and source record IDs.

The existing acquired proposal writer admits a sourced state selective excise with its ninety-day term. This binder preserves that limit and refuses other tax families or local authority. Income brackets, annual allowances, payroll withholding, per-unit charges, school/special districts and natural taxable-base production are not added.

## Vital statistics

The final native run passed eight of eight checks in 11.43 seconds; the test bodies took 13 milliseconds. The first seven-case run passed in 15.62 seconds. Both used only the new focused test file.

Scoped strict types passed for two roots, traversing 844 files with zero owned diagnostics. Changed-file lint, formatting and whitespace checks passed. Final type and publication receipts accompany the handoff.

Zero-dice found no new draws and five stale removed entries on main. Its allowlist was preserved. The release checker retained main's existing CI declaration prose failure; that file was not changed.

No old tax tests, whole suite, browser, game year, speed benchmark, nationwide activation or natural assessment/payment run was executed. No complete M7 claim follows from these conversion checks.

## Next endpoint

The coordinator supplies the canonical category query and dated/cutoff extension. Team6 then replaces the explicit missing dependency with that exact published query on its owned consumer surface. Shared authority and starting-law admission remain explicit dependencies.

## Method

The source was self-reviewed against the transferred two-file scope and existing writers. No helper or new team was created. The native command used the repository storage guard and terminal receipts under `/tmp/team6-tax-binding-*`. Tests authored conversion records; they did not enact a real tax or create a payer.
