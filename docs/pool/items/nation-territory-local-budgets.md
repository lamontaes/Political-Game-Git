---
id: nation-territory-local-budgets
title: "Guam, the Virgin Islands, American Samoa and the Northern Marianas have local-government budget rows, and Puerto Rico's municipios have their own revenue lines and spending"
area: gov
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: nation
after:
model: sonnet
effort: medium
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** Puerto Rico's municipio budgets now come from the Oficina de Gerencia y Presupuesto's (OGP) approved General Fund for fiscal 2024-25 (data/research/money/puerto-rico-municipal-budget-fy2025.json, written into the bases by scripts/research/export-public-budget-bases.py): each municipio's own total over its own residents, on the island's revenue mix, with spending on the states' city mix without schools (stopgap SG-GOV-territory-municipal-mix). The other four island areas (Guam, the Virgin Islands, American Samoa, the Northern Marianas) still have only a `state` row, so a town there has a $0 budget as Toa Alta did. Add their local-government rows from each territory's own published budget or, where none is found, the real per-resident average of the island areas with a spread, tagged ESTIMATED. For Puerto Rico, read each municipio's own revenue lines (OGP Ingresos Recurrentes and No Recurrentes by municipio), its spending by function (OGP's municipal expenditure files: salaries, fringe benefits, social assistance, the rest) and its federal grants.

**Cause.** Found in code: stopgap SG-GOV-territory-municipal-mix (src/core2/data/stopgaps/gov.json, line 2237) marks that the four island areas have only a `state` row, and scripts/research/export-public-budget-bases.py exports the municipio bases for Puerto Rico only.

**Fix.** Add local-government rows for the four island areas and Puerto Rico municipios' own lines through the same bases file.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One budget store: the rows go through the same bases file and the same `publishedBudgetFor` as every place, never a second path. Estimate, never unknown. One rule for all 56 places: no territory named in logic, only in the data.

**Done when.** A second session, not the builder, plays a year (buildBenchWorld or a life core with openLaws and openBudgets) at a place drawn from each of Guam, the Virgin Islands, American Samoa and the Northern Marianas on seeds nobody chose, and sees the town's own government with revenue and spending lines; Toa Alta's lines are its own (OGP) and not the island's mix. src/core2/pr-municipio-budget.test.ts and a territory test (src/core2/territory-local-budgets.test.ts, new) prove it by record id.

**Waits on.** Nothing.

**Files.** scripts/research/export-public-budget-bases.py, data/research/money/public-budget-bases.json, data/research/money/puerto-rico-municipal-budget-fy2025.json, src/core2/modules/budgets.ts, src/core2/pr-municipio-budget.test.ts, src/core2/territory-local-budgets.test.ts (new)

**Notes.** Found by the Screens ten-place sweep (H. Rivera Colón PR, Toa Alta Municipio, $0 in and out), fixed for Puerto Rico in #7955; the Coordinator asked for this follow-up for the other territories on Nov 9.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given four island areas local budget rows; the estimated budgets already show.
