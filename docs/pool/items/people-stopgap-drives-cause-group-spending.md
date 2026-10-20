---
id: people-stopgap-drives-cause-group-spending
title: "Stopgaps in drives (cause-group-spending): 1 open"
area: people
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/drives.ts, kind cause-group-spending"
after:
claimed-at: 
---

**What.** Let a cause group choose what its money buys, not only ad time. Today `spendGroupFunds` in drives.ts spends a share of the group's balance each month on `buyAdTime` from the campaigns engine and nothing else (stopgap SG-CORE-cause-group-ads-only). The campaigns engine already sells the other reach: `holdEvent` rents a venue and calls people, `sendMail` pays a mailer to addresses, and a press purchase reaches readers. Give the group the same menu through the shared chooser: each month it scores ad time, an event, a mailer and saving toward a cause cost (a lawyer for the cause, a petition drive only where the golden path needs one), reading its members' plans, its balance against each item's minimum buy, and the reach per dollar each already reports. The winning purchase is bought through the same seller records as a campaign's, and its audience is the people who hear it, who then hold the cause in the views engine.

**Rules.** An effect is a read, not a record: each purchase is read by the views engine (who now holds the cause) and the news engine (a public event or ad), and its dollars by the journal. No dice: the choice follows the group's balance, its members' recorded plans and each channel's reach per dollar; nothing is rolled. Replace, never layer: the ads-only path and SG-CORE-cause-group-ads-only are deleted in the same change, ad time staying as one option of the menu. Wire to the world: every dollar goes from the group's account to a recorded seller, a venue or the printer, on the journal. One model, two tiers: a mailer or an event reaches counted people by the same rule as full people, times their count. No hand-written player text: the event and mailer are told by the English engine.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) a cause group that raised money buys at least two different kinds of reach across the year, each as a purchase record id on the journal, and the views engine records people who came to hold the cause from the event or the mailer, by person id. A test in src/core2/drives.test.ts shows two groups with different balances and plans choosing differently.

**Files.** src/core2/modules/drives.ts, src/core2/modules/campaigns.ts, src/core2/data/stopgaps.json, src/core2/drives.test.ts

**Notes.** First row: A cause group spends its money only on ad time, bought through the campaigns engine's ad purchase; it holds no events, sends no mailers and pays none of a cause's own costs.

Oct 20 (pool feeder): spec written; the buying functions already exist in campaigns.ts but take a campaign's filingId; the builder generalizes them to take a buyer id, so a campaign and a group buy the same way. The first row's fix is a small signature change, not a new engine.
