---
id: world-eviction-to-hospital-visits-unit-and-measure
title: "Eviction to hospital visits: the link needs a unit adapter and a hospital-visits measure an engine produces"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The link eviction-to-hospital-visits (Collinson et al. 2024, QJE: +0.188 nonpregnancy hospital visits per covered tenant over quarters 1 to 4, 95 percent interval 0.00376 to 0.37224; quarters 5 to 8 -0.113, interval -0.39132 to 0.16532) has no size the web can apply: the study's unit is visits per covered tenant for marginal filed-case tenants, and no engine produces a health.hospital-visits measure.

**Rules.** No dice. The size is a published estimate with its spread, tagged SOURCED; the exposure is the evicted household's members, not every move. An effect is a read: a health engine must multiply its own visit rate by it for a named or counted evicted person.

**Done when.** A unit and exposure adapter maps the study's per-covered-tenant count to the evicted household's members; a health engine keeps a hospital-visits record per person or counted group; in a drawn bench world an evicted household's members show more recorded visits than a twin world's without the eviction, by record id.

**Files.** data/research/outcome-web/links.json,src/core2/modules/health.ts,src/core2/modules/housing.ts

**Notes.** Nov 9 (Laws and effects): found while looking for a local-ordinance outcome link (right to counsel in eviction is a town ordinance). Source: https://www.nber.org/system/files/working_papers/w30382/w30382.pdf. Quarters 5 to 8 are not significant, so the shape is a first-year effect that does not persist.
