---
id: people-unplaced-outside-employer
title: "Commuting workers have an employer on the books: the place's outside account employs them, with pay and withholding"
area: people
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:25:08.641Z
---

**What.** The opening shares a place's workers who commute or work in industries the town does not model as a fractional count per household, paid from one untaxed stand-in. They need an employer on the books that can pay them with withholding. The place's outside-market account is that employer: it now carries a pay authority naming the commitments it pays (core-outside-wage-obligation), so a job there is paid and withheld by the ordinary work payroll. A met commuter holds such a job (people-unplaced-fill-in-job).

**Rules.** One model, two tiers: the counted tier's share of the same pay is withheld by the same law (`payGroups` in src/core2/counted-money.ts), times its count, so counted commuters need no individual job until they are met. Replace, never layer: the filled-in copy of the flow is deleted. Estimate, never UNKNOWN: the pay is the place's median earnings marked ESTIMATED with its source.

**Done when.** In a test in src/core2, in a drawn place (buildBenchWorld, name and seed in the PR body), a filled-in commuter has a job at the place's outside account, is paid on the payday and has withholding records by record id, and the account stays at zero; src/core2/unplaced-fill-in-job.test.ts shows it, and src/core2/outside-wage-obligation.test.ts shows the account's authority paying and refusing.

**Files.** src/core2/opening-outside-market.ts, src/core2/public-work-pay.ts, src/core2/modules/residents.ts

**Notes.** Built Oct 19 (claude/peaceful-ritchie-03780x) with core-outside-wage-obligation and people-unplaced-fill-in-job in one PR. The pay follows the place's pay level through the jobs engine's yearly raise (`raisePay` reads every open job, the commuter's at the account's place), starting at the opening's level as every job does without a pay row; the old flow tracked the level every payday. The counted tier stays one place-level flow by design (it is taxed by `payGroups`); making each counted commuter an individual job would put every one of them on the full-person books and break the two-level population.
