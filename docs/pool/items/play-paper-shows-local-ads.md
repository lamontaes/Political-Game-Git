---
id: play-paper-shows-local-ads
title: "The town's paper shows the ads its local businesses bought"
area: play
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-press-outlet-revenue
source: added with npm run pool -- add
---

**What.** Since gov-press-outlet-revenue, the town's businesses buy ads from the town's outlets out of their own costs, and each purchase is a record (the press module's adBuys table: outlet, advertiser, amount, the payment's transfer id). No screen reads it, so the player never sees a local paper run an ad from a shop they know. Give the outlet's page in play (or the paper the player reads) the advertisers it carried this month, named from their organization records.

**Rules.** No hand-written player text: the screen shows record data (the business's name, the amount) and control names only; any sentence about an ad comes from the English engine. An effect is a read, not a record: the screen reads adBuys at view time. Read-only screens spend no game time and create no facts.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place, the bench shows a local outlet's advertisers for a month, each named from its organization record and matching that month's adBuys rows by id, with a browser screenshot in the PR (browser-visual-acceptance).

**Files.** src/core2/press-money.ts, src/bench (the outlet or paper view)

**Notes.** Split from gov-press-outlet-revenue's last done-when line (the owner sees a local paper run an ad from a shop he knows): the bench has no newspaper page yet.
