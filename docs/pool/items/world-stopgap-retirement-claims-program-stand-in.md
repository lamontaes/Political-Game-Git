---
id: world-stopgap-retirement-claims-program-stand-in
title: "Stopgaps in retirement-claims (program-stand-in): 1 open"
area: world
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/retirement-claims.ts, kind program-stand-in"
after: world-social-security-earnings-record, world-retirement-benefit-from-law-and-record
claimed-at:
---

**What.** This is the roll-up for the stopgap SG-CORE-retirement-claims-in-play: people who reach their claim age in play start a Social Security award sized like the opening's (a participant average scaled by modeled covered months), paid monthly by the place's outside payer, with no recorded earnings, no formula from the law, and no spouse or survivor benefit. It closes with two parts: world-social-security-earnings-record (each worker's covered earnings recorded from the wages they are paid) and world-retirement-benefit-from-law-and-record (the award sized by the formula in the law in force from that record). world-jobs-counted-retiree-income, already in progress, covers a counted retiree drawing from their own earnings record, and the second part builds on it. When both parts are done, delete the stand-in sizing and the marker in retirement-claims.ts and resolve the row.

**Rules.** Replace, never layer: the participant-average sizing is deleted when the formula replaces it, not kept beside it. Placeholders: the row is closed only because the mechanic is built. An effect is a read, not a record: the claim must read the law and the earnings record, and the account must read the award. One model, two tiers: the proof covers a full and a counted claimant. This is a game, not a spreadsheet: spouse, survivor and earnings-test benefits are a question for the owner in the PR body, not a feature.

**Done when.** After both parts are done, a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose) shows a full and a counted claimant each starting an award by claim record id sized from their earnings record by the law row, no stopgap hit for SG-CORE-retirement-claims-in-play, the row resolved in stopgaps.json, and src/core2/retirement-claims.test.ts passing.

**Files.** src/core2/modules/retirement-claims.ts, src/core2/data/stopgaps.json, src/core2/retirement-claims.test.ts

**Notes.** First row: People who reach their claim age during play, full or counted, start a Social Security award sized like the opening's (a participant-average amount scaled by modeled covered months), paid monthly by the place's outside p

Oct 20 (pool feeder): spec written; the row replacement ('GOV's Social Security program') had no existing item; earnings are not recorded anywhere in core2 today, so a record comes first. Split into two parts.
