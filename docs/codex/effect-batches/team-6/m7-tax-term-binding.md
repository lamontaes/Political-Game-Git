# Adopted tax terms now have a validated consumer

The new binder validates declared adopted terms and their saved public recipient, and the existing tax handler now requires that binding for the new catalog tax questions. The production numeric query is used directly. The shared category endpoint is still unfinished, so those questions remain unavailable until the coordinator supplies it. Existing supported typed levies retain their assessment and actual collection path. This slice does not establish new catalog-tax activation.

## Merged

The tax handler and registration are on main. This A33 consumer is a separate draft built from main `8c44a3d24f9808962a839bc035bbcfdb009d1aa9`, receiving main `820fb93fdd35522dca20df9b2178fa926f73e92e` additively. Production changes are the owned binder and its call in `src/simulation/law-consequences/tax.ts`. Both focused test files are owned. Shared queries, catalog, tax types, assessment and collection writers are unchanged.

## What emerged

HARDWIRED — `bindTaxLawTerms` reads all five published numeric keys using the canonical adopted-text query. It requires explicit series, base, exemption and recipient categories from the shared query dependency. It checks the exact acquired power, operative law, saved proposal, government identity and organization profile.

HARDWIRED — a controlled saved-record fixture returned the existing typed proposal terms and recipient identity. Repeat calls left the fixture byte-identical. The actual numeric query read authored adopted sections; the category callback supplied explicit controlled query results. This does not prove that a production category query exists or that a natural law reached a payer.

HARDWIRED — missing categories, wrong units, conflicting sections, absent exemptions, ambiguous or mismatched recipients, missing or closed public organizations, unsupported power and changed frozen terms returned unavailable. An explicitly adopted zero rate remained zero. Retained assessment and collection records were unchanged in every tested case.

The existing handler's controlled levy still assessed Elijah Peterson for 100 USD cents and later transferred those 100 cents to its saved public recipient. That retains the prior authored test behavior; it is not a new catalog-tax payment or a researched cannabis rate. The new catalog-tax case reached its saved scenario payer through the actual handler, wrote no assessment or collection, and preserved cash and the serialized save across repeat and Continue.

## Connections

The binder returns existing `TaxTerms`, proposal ID, exact saved public organization/government identity and source IDs. Metadata comes from the already saved typed proposal; numeric and categorical fields cannot fall back to catalog labels or generated defaults. Terms must still match that frozen proposal.

The admitted tax handler calls the binder before its existing policy lookup and preview for new catalog tax questions. A refused binding produces no resolved assessment. A validated binding adds its source IDs to the resolved consequence. The handler still uses the sole assessment writer and separate due-date collection. The binder has no writer, clock hook, tax calculator, collection path or liability override.

## Missing links

The exported `ReadAdoptedTaxCategory` callback is an explicit dependency with the existing survivor's `FinalEnactedLawCategories` result type. Without it, the binder refuses to bind. It implements no category history scan. Historical date/cutoff and starting-law proposal bindings remain unavailable.

The coordinator's extended numeric query was fetched successfully at `df5b923473b00706fccd9761bdc6c54d298a7d1e`. The consumer carries its date/cutoff request while retaining a current-only guard until the shared query and governing-law cutoff contracts land on main. No full earned-pay branch was taken.

The remaining category endpoint is the existing plural survivor: `readFinalEnactedLawCategories(world, law, {questionKey, termKey, onDate, cutoff})`. Its result carries values, measure ID, provision ID and source record IDs. The coordinator owns moving/extending that query and starting-category admission.

The existing acquired proposal writer admits a sourced state selective excise with its ninety-day term. This binder preserves that limit and refuses other tax families or local authority. Income brackets, annual allowances, payroll withholding, per-unit charges, school/special districts and natural taxable-base production are not added.

## Vital statistics

The final two-file native run passed all 17 checks in 21.86 seconds: eight binder checks and nine handler checks. The binder-only run passed eight of eight in 11.43 seconds. The first two-file integration run passed 16 checks and failed the new refusal check because an untouched canonical save omits optional tax-history arrays. The repair checks unchanged optional arrays, zero record counts, exact cash and byte-identical serialized history; it changes no prior assertion or producer. Failed and passing receipts are retained in the proof folder.

Scoped strict types passed for four roots, traversing 1,142 files with zero owned diagnostics. Changed-file lint, formatting and whitespace checks passed. Final type and publication receipts accompany the handoff.

Zero-dice found no new draws and five stale removed entries on main. Its allowlist was preserved. The release checker retained main's existing CI declaration prose failure; that file was not changed.

Only the new binder test and changed tax-handler test were run. No whole suite, browser, game year, speed benchmark, nationwide activation or natural assessment/payment run was executed. No complete M7 claim follows from these checks.

## Next endpoint

The coordinator supplies the canonical category query and dated/cutoff extension. Team6 then replaces the explicit missing dependency with that exact published query on its owned consumer surface. Shared authority and starting-law admission remain explicit dependencies.

## Method

The source was self-reviewed against the transferred two-file scope and existing writers. No helper or new team was created. The native command used the repository storage guard and terminal receipts under `/tmp/team6-tax-binding-*`. Tests authored conversion records; they did not enact a real tax or create a payer.
