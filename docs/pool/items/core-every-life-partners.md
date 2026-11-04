---
id: core-every-life-partners
title: "Every life is simulated, unit 4: relatives living elsewhere partner, marry and part"
area: core
kind: feature
priority: 1
size: M
status: done
claimed-by: lives/partners
pr: #7082
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T21:57:46.055Z
---

**What.** Unit 4 of core-every-life-simulated. Nobody forms or ends a partnership in play (setPartnersV1 has no caller). People living elsewhere get a monthly pull to partner (the opening chain's ACS first-marriage and NCFMR remarriage paces for single people their age) and couples a pull to part (NSFG's intact-marriage curve), moved by their traits; a single person with nobody suitable gets a generated partner, and every change goes through setPartnersV1 with their relatives in town as witnesses.

**Rules.** One engine per mechanic: setPartnersV1 is the one writer and the opening's partnership chain is shared, not copied. No dice: pulls add up from rates and traits; a generated partner is who exists. Two-level population: no fill-in, no money moved.

**Done when.** In a generated world of a place drawn from all 56, the partnerships and separations of people living elsewhere in a year are within the real rates' spread (src/core2/partnerships.test.ts, three draws); in a buildBenchWorld run with a seed the builder did not choose, a relative's family.partnered or family.separated record is named by id and in the player's knowledge; speed:year within 20% of base.

**Files.** src/core2/modules/partnerships.ts, src/core2/opening-partnership.ts, src/core2/state.ts, src/core2/partnerships.test.ts

**Notes.** Split from core-every-life-simulated by the lives lead, Nov 1; town partnering (households) and the counted population are later units.
