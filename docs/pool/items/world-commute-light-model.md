---
id: world-commute-light-model
title: "Counted workers commute to the nearest places with openings, and outside spending follows them"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** The owner ruled on Oct 24 for a light simulation of commuters' pay and outside spending, not labeled estimates forever and not a full regional model. Counted workers the opening cannot place in town commute to the nearest places with openings, paid by those places' employers at their wages. The part of a household's spending not bought in town goes to sellers in the places its workers commute to, or the nearest place that has them. The LEHD LODES shares already on main (`data/source/lodes-commuting/place-commuting.json`, read by `src/core2/commuting-shares.ts`) and the ACS shares calibrate the totals and never pick one worker.

**Rules.** One model, two tiers: a counted group commutes and spends by the same rule as a full person, times its count. No dice: who commutes where follows the openings and distance on record, never a roll; the real shares check totals. One rule, all 56 places: the shares come from data per place, with the national average marked ESTIMATED where LODES has no file.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module) in a drawn place, seed named, the commuter share sits within its LODES spread, one named commuter's paycheck is traced by record id from the outside employer to the household, and one household's outside purchase is traced to a seller in the commute place; stopgaps `SG-CORE-outside-living-costs` and `SG-CORE-unplaced-workers-income` are cleared.

**Files.** src/core2/commuting-shares.ts, src/core2/opening-employment.ts, src/core2/cost-of-living.ts, src/core2/data/stopgaps.json

**Notes.** Owner ruling, Oct 24 (OWNER-DECISIONS.md, "Commuters' pay and outside spending"). Related: `world-commuters-in-opening` (full workers in the opening) uses the same shares; do not build two commute rules.
