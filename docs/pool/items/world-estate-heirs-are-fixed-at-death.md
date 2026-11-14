---
id: world-estate-heirs-are-fixed-at-death
title: "An heir who dies while an estate is in probate loses their share to the state instead of passing it to their own heirs"
area: world
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found while fixing tests-law-wiring-taxes-dennis-ma-property-tax-cap-unapplied, Nov 14 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** An estate waits in probate for 270 days (`probateDays`), and the heirs are read only on the day probate closes. If the one heir dies in those days, the estate has no living kin on that day and escheats to the state, assessed on nothing for the estate tax. In real law the heirs are fixed by who survives the death, and an heir who dies later passes their share on through their own estate. Seen: a family's estate and its tax, in the Money and Journal screens and the news of a death.

**Cause.** Found in code: `distribute` in src/core2/estates.ts reads `heirsOf(api, person)` when probate closes, so the survivors at the death are never recorded. Measured at Dennis, Massachusetts (2516740, seed f090a9034b487078ca7c3d2a2c1a40207804ca4e): a U.S. House member (official:seat:US-CA:us-house:41) died in the test on 2025-08-21 with 255,074,828 minor units; the only heir, a partner aged 37 (person_55958daf6e076808), died of heart disease on 2025-10-25. At probate close `heirsOf` was empty, so the estate escheated and the estate tax assessed was 0.

**Fix.** At the death, record the heirs and their shares on the probate row (the table `settleEstate` already writes for a trust), and at close pay each share to the heir if alive, else to that heir's own heirs through the same rule; escheat only when no one in the chain is living.

**Time box.** 4 hours.

**Rules.** One model, two tiers: the counted estate path (`settleCountedEstate`) reads the same record. No dice: who inherits follows the intestate order and the will. Wire to the world: the inheritance and estate taxes read the shares recorded.

**Done when.** In a played year at a place and seed named in the PR body, a decedent whose only heir dies in probate has the share paid to that heir's heirs, by transfer record id, with the estate tax assessed on the whole estate. A second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/core2/estates.ts
