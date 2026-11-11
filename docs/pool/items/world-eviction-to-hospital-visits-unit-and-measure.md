---
id: world-eviction-to-hospital-visits-unit-and-measure
title: "Eviction to hospital visits: the link needs a unit adapter and a hospital-visits measure an engine produces"
area: world
kind: wiring
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
lead: laws-effects
after:
model: opus
effort: high
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The link eviction-to-hospital-visits (Collinson et al. 2024, QJE: +0.188 nonpregnancy hospital visits per covered tenant over quarters 1 to 4, 95 percent interval 0.00376 to 0.37224; quarters 5 to 8 -0.113, interval -0.39132 to 0.16532) has no size the web can apply, because the study's unit is visits per covered tenant for marginal filed-case tenants. No engine produces a health.hospital-visits measure either. The health engine keeps conditions and the coverage engine prices bills per member, so a per-person care-use record is a new mechanic in the health line. Adapt the study unit to the evicted household's members, keep a hospital-visits record in the health engine, and show an evicted household with more visits than a twin world.

**Cause.** Design: the owner's rule "an effect is a read, not a record" in AGENTS.md, and the published link in data/research/outcome-web/links.json (Collinson et al. 2024, https://www.nber.org/system/files/working_papers/w30382/w30382.pdf); see the Nov 9 note below. Docs path: docs/design/one-model-two-tiers.md governs the counted case.

**Fix.** Add a unit and exposure adapter that maps the study's per-covered-tenant count to the evicted household's members, and a hospital-visits record per person or counted group in src/core2/modules/health.ts that multiplies the engine's own visit rate by the link for a named or counted evicted person.

**Time box.** 10 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. The size is a published estimate with its spread, tagged SOURCED; the exposure is the evicted household's members, not every move. An effect is a read: a health engine must multiply its own visit rate by it for a named or counted evicted person. One model, two tiers: a counted evicted household reads the same rule times its count.

**Done when.** A second session (not the builder) plays a bench world in a drawn place (place and seed named) with and without an eviction, and sees an evicted household's members show more recorded hospital visits than the twin world's without the eviction, by record id; the first-year effect fades after quarter 4 as the study's quarters 5 to 8 are not significant.

**Waits on.** Nothing.

**Files.** data/research/outcome-web/links.json, src/core2/modules/health.ts, src/core2/modules/housing.ts, docs/design/one-model-two-tiers.md

**Notes.** Nov 9 (Laws and effects): found while looking for a local-ordinance outcome link (right to counsel in eviction is a town ordinance). Source: https://www.nber.org/system/files/working_papers/w30382/w30382.pdf. Quarters 5 to 8 are not significant, so the shape is a first-year effect that does not persist.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have added a unit adapter and a hospital-visits measure to one outcome link; no player sees a hospital-visits number.
