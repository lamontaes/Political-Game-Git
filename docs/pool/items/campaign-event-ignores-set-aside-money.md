---
id: campaign-event-ignores-set-aside-money
title: "A campaign's evening out is offered on the account's cash alone, so it spends the money set aside for circulators and the next payment stops the world (I Liyang, Northern Mariana Islands)"
area: gov
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by:
pr: 9268
after:
blocked-on:
lead: wire-office
model: sonnet
effort: medium
root: none
source: found on the clean train at I Liyang, Northern Mariana Islands, Nov 14, 2026 (coordinator)
---

**What.** On the clean train a played world stops on 2025-10-08 at I Liyang, Northern Mariana Islands (place territory:MP:i-liyang, 6918250; seed 9a0022709c0625e7690862cc99da809bdc21c4e18dc26457386aa69cee9ef78e) with "Invalid nonnegative integer journal amount: owner after", from `circulatorShift` (src/core2/modules/campaigns.ts) paying a petition circulator more than the campaign's account holds. The campaign is a rival's in the 2025 special election for the territory's at-large seat. Seen: the world stops in play at that place and seed, for any player who plays that place through the autumn of 2025.

**Cause.** Measured: with the seed and place above, a run of the played world with a log in `spend` for the first campaign (the filing ending fe688fb1a6ea92c4) showed raised 70,500, spent 69,091 and the account at 1,409 with 12,930 set aside for circulators; the two events on 2025-09-23 and 2025-09-29 had each paid the 24,075 venue price when the account held more than the price but less than the price plus the circulators' fund (raised 70,100, spent 40,546, circulators 17,400, so 11,656 free). Found in code: `campaignDayOpen` offers the evening ("event" and "forum") when the account's cash is at least the venue's price (`affords` in src/core2/campaign-day.ts), and the rival's day (`rivalDay`, `takeCampaignDayChoice` from `campaignTurn`) takes it; the campaign's own books (`freeMinor`) already exclude the money set aside for circulators, a poll and an event, but the day's choice read the whole account.

**Fix.** One new function `eveningMoneyMinor` in src/core2/modules/campaigns.ts (the account's cash less the circulators' fund and the poll fund; the event fund is the evening's own) read by both `affords` and the choices' cash fact in src/core2/campaign-day.ts, so the screen's control, its reason line and the rival's choice agree. Test src/core2/campaign-event-money.test.ts, pinned at the place and seed above: fails on the train (the world stops), passes with the change, and checks each campaign's account covers its circulators' fund.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the evening is offered by the money the records say is free. One rule, all 56 places: the fix names no place. Speed: a year may not run more than 20 percent slower than its base.

**Done when.** A second session plays I Liyang, Northern Mariana Islands on the seed above past 2025-10-12 in the running game, and a second drawn place with a petition race through its filing season, and sees no stop; the evening-out control on the campaign day screen shows its money reason line when the account holds only what is set aside for circulators.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/campaign-event-money.test.ts

**Notes.** Filed by hand on the branch of the PR that fixes it. The ad and mail buys read `raisedMinor - spentMinor` for what they may spend, not `freeMinor`, but both are capped by the turn's budget, which is a share of the free money, so they did not cause this stop; they may deserve the same read and are left alone here.
