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
standard: 2
lead: play-first
model: sonnet
effort: medium
root: none
after:
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Since gov-press-outlet-revenue, the town's businesses buy ads from the town's outlets out of their own costs, and each purchase is a record in the press module's `adBuys` table: outlet, advertiser, amount and the payment's transfer id. No screen reads it, so the player never sees a local paper run an ad from a shop they know. Give the paper view the advertisers a local outlet carried this month, named from their organization records. This is a read of records that exist and adds no mechanic.

**Cause.** Found in code: the `adBuys` table is written in src/core2/modules/press.ts (line 360) and read only in src/core2/press-money.ts (line 319) and its test; no src/bench file reads it, and the bench has no paper page for it yet.

**Fix.** Show, on the outlet's page in News (the paper the player reads), the advertisers it carried this month, each named from its organization record, read at view time from `adBuys`, with any sentence about an ad coming from the English engine. The screen spends no game time and creates no facts.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the screen shows record data (the business's name, the amount) and control names only, and any sentence about an ad comes from the English engine. An effect is a read, not a record: the screen reads `adBuys` at view time. Read-only screens spend no game time and create no facts.

**Done when.** A second session (not the builder) plays one year of the played world (`buildBenchWorld`) in a drawn place (place and seed named), opens News on a local outlet's tab and sees the advertisers it carried for one month, each named from its organization record and matching that month's `adBuys` rows by record id, with a screenshot at 1440x900 in the PR. A bench test fails when an advertiser shown has no `adBuys` row.

**Waits on.** Nothing. (gov-press-outlet-revenue, which it once waited on, is closed; the `adBuys` records it wrote are on main.)

**Files.** src/core2/press-money.ts, src/core2/modules/press.ts, src/bench/play.mjs, src/bench/ui/news-board.mjs

**Notes.** Split from gov-press-outlet-revenue's last done-when line (the owner sees a local paper run an ad from a shop he knows): the bench has no newspaper page yet.

After cleared (Nov 11, 2026, cause finder for Fable B): `after:` still named gov-press-outlet-revenue, which is dropped, and the pool opens an `after:` gate only for a merged or done item, so `pool next` could never offer this one. Its Waits on already says Nothing.
