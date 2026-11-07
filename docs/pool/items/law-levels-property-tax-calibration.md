---
id: law-levels-property-tax-calibration
title: "Keep combined property-tax survey estimates out of the enacted-law table"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: astra/property-tax-calibration
pr: #7333
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T22:22:23.982Z
---

**What.** The strict reversal audit draws Mill Plain CT and finds a county property-tax law for planning region 09120 with no legislative body. The producer documents this as ACS median taxes divided by home value across every taxing level, not a county statute. Store it as calibration in the existing laws module and retain the same tax fallback through the shared resolver.

**Rules.** No audit skiplist or fictional county power. Preserve every amount, source and date. Reuse the calibration table added by 7331. Actual enacted property-tax rows supersede the statistical fallback. No campaign, electorate or view changes.

**Done when.** Mill Plain replay ab5328363fd3c139 has no statistical property-tax statute or law calendar event, but the property-tax reader retains its researched amount and a genuine body can replace the fallback by authorized bill. Break-it, ten fresh generated worlds and a new-game check. Strict audit no longer fails on this calibration record.

**Files.** src/core2/laws-starting.ts,src/core2/laws-in-force.ts,src/core2/modules/laws.ts,src/core2/property-tax-calibration.test.ts

**Notes.** Astra child of draft 7330. Two-hour unit, no helpers. Source data explicitly calls this a survey estimate of combined taxes, not a statutory rate. Does not claim exact local levy research is complete.
