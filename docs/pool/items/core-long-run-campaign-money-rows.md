---
id: core-long-run-campaign-money-rows
title: "Drop campaign money rows once each posting is made"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Every campaign cash movement (a gift, an ad buy, a mailer, a cause group's ad) writes a row to the campaigns engine's money table and keeps it forever, and the table's slot cache keeps a second copy. A long save of Ringgold, Louisiana held 81,917 rows at year 18, the fifth largest table. Only the posting call itself reads a row: every later reader reads the campaign row's raisedMinor, spentMinor and spentByKind or the cash journal.

**Rules.** Speed (owner, Oct 29): old records fold once play no longer reads them. The governing lead, who owns campaigns, agreed on Nov 1 at 21:22 UTC to drop the table; the play-first lane agreed the dev trace may say in plain words that the record behind a receipt was folded once the payment posted. Replace, never layer: the table, its put and its slot cache are deleted, as budgets' withholding already holds a slot only for the posting.

**Done when.** A four-year run of the played world (npm run speed:year -- --seed long-1 --years 4, Ringgold, Louisiana) on main and the branch, one process each, keeps dev mode's records proof identical in every table except core2-campaigns-v1.money, which is gone, and the campaigns engine's tests that read the table pass in drawn places named with their seeds, reading the campaign totals or the cash journal instead.

**Files.** src/core2/modules/campaigns.ts,src/bench/dev-trace.ts

**Notes.** lead: speed. Round four; reader map in the speed lead's scratchpad r4/round-four-map.json (campaignMoney).
