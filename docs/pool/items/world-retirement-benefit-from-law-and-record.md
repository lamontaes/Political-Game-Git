---
id: world-retirement-benefit-from-law-and-record
title: "A retirement award is sized by the Social Security formula in the law in force from the claimant's recorded earnings"
area: world
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: world-social-security-earnings-record, world-jobs-counted-retiree-income
blocked-on:
lead: money
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
milestone:
source: Split from world-stopgap-retirement-claims-program-stand-in by pool feeder Oct 20
checked: fable 2026-11-10
---

**What.** Awards in `claim` (src/core2/modules/retirement-claims.ts) are a participant average scaled by modeled covered months. Replace the size with the law's formula: put the benefit formula in the law rows (the bend points and the 90, 32 and 15 percent rates of the primary insurance amount, the annual indexing, the reduction for claiming before full retirement age and the credit for delay, the cost-of-living adjustment) so that a Social Security bill changes them, compute the average indexed monthly earnings from the person's covered-earnings record (world-social-security-earnings-record), and make the monthly payment follow the person's claim age from `social-security-law.ts`. Ongoing awards re-rate when the law's cost-of-living row changes. Delete the participant-average benefit parameters and the SG-CORE-retirement-claims-in-play marker. Spouse, survivor and earnings-test benefits are not built: the owner's baseline lists no such step, so the PR body asks whether to add them.

**Cause.** Found in code: `claim` in src/core2/modules/retirement-claims.ts (line 304) sizes an award as a participant average scaled by modeled covered months, and SG-CORE-retirement-claims-in-play (src/core2/data/stopgaps/core.json) is open.

**Fix.** Put the benefit formula (bend points, indexing, claim-age adjustment, cost-of-living adjustment) in law rows, compute the amount from the covered-earnings record, re-rate ongoing awards when the cost-of-living row changes, and delete the participant-average parameters and the stopgap marker.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the claim reads the law row in force and the earnings record, and the payer's cash and the person's account read the award. One rule, all 56 places: the formula is federal law data, with the territories' coverage in their own rows. No dice: the amount is the formula, the record and the claim age. Replace, never layer: the participant-average sizing is deleted when the formula replaces it. One model, two tiers: a counted claimant is sized from their column by the same formula and fill-in keeps the award. This is a game, not a spreadsheet: no application or form step is added for the player.

**Done when.** A second session, on main in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), plays a year in dev mode and sees a person who reaches their claim age start an award by claim record id whose amount equals the law-row formula applied to their covered-earnings record, a person with higher lifetime earnings get a larger award, and a changed cost-of-living law row re-rate ongoing awards. A counted claimant is paid the same by the group flow, src/core2/retirement-benefit-formula.test.ts proves it, and the stopgap row is resolved.

**Waits on.** world-social-security-earnings-record and world-jobs-counted-retiree-income (done).

**Files.** src/core2/modules/retirement-claims.ts, src/core2/social-security-law.ts, src/core2/data/laws/social-security-ages.json, src/core2/data/laws/starting-law.json, src/core2/data/opening-income.json, src/core2/retirement-benefit-formula.test.ts (new), src/core2/data/stopgaps/core.json

**Notes.** Split from world-stopgap-retirement-claims-program-stand-in by pool feeder Oct 20.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sized a pension from the Social Security formula; no player sees a retiree's formula, and the stand-in item it closed is dropped.
