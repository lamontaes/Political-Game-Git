---
id: world-retirement-benefit-from-law-and-record
title: "A retirement award is sized by the Social Security formula in the law in force from the claimant's recorded earnings"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: world-social-security-earnings-record, world-jobs-counted-retiree-income
blocked-on:
milestone:
source: Split from world-stopgap-retirement-claims-program-stand-in by pool feeder Oct 20
---

**What.** Awards in `claim` (src/core2/modules/retirement-claims.ts) are a participant average scaled by modeled covered months. Replace the size with the law's formula: put the benefit formula in the law rows (the bend points and the 90, 32 and 15 percent rates of the primary insurance amount, the annual indexing, the reduction for claiming before full retirement age and the credit for delay, the cost-of-living adjustment) so that a Social Security bill changes them, compute the average indexed monthly earnings from the person's covered-earnings record (world-social-security-earnings-record), and make the monthly payment follow the person's claim age from `social-security-law.ts`. Ongoing awards re-rate when the law's cost-of-living row changes. Delete the participant-average benefit parameters and the `SG-CORE-retirement-claims-in-play` marker. Spouse, survivor and earnings-test benefits are not built: the owner's baseline lists no such step, so the PR body asks whether to add them.

**Rules.** An effect is a read, not a record: the claim reads the law row in force and the earnings record, and the payer's cash and the person's account read the award. One rule, all 56 places: the formula is federal law data, with the territories' coverage in their own rows. No dice: the amount is the formula, the record and the claim age. Replace, never layer: the participant-average sizing is deleted when the formula replaces it. One model, two tiers: a counted claimant is sized from their column by the same formula and fill-in keeps the award. This is a game, not a spreadsheet: no application or form step is added for the player.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a person who reaches their claim age starts an award by claim record id whose amount equals the law-row formula applied to their covered-earnings record, a person with higher lifetime earnings gets a larger award, a changed cost-of-living law row re-rates ongoing awards, a counted claimant is paid the same by the group flow, and src/core2/retirement-benefit-formula.test.ts proves it; the row is resolved in stopgaps.json.

**Files.** src/core2/modules/retirement-claims.ts, src/core2/social-security-law.ts, src/core2/data/laws/social-security-ages.json, src/core2/data/laws/starting-law.json, src/core2/data/opening-income.json, src/core2/retirement-benefit-formula.test.ts, src/core2/data/stopgaps.json

**Notes.** Split from world-stopgap-retirement-claims-program-stand-in by pool feeder Oct 20.
