---
id: campaign-doors-knocked-exceeds-the-towns-homes
title: "A campaign's 'Doors knocked' passes the number of homes in the town"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: "Playtester P3, Nov 13, 2026 (crew line #8928, comment 6844698994)"
checked:
claimed-at:
---

**What.** In a village with 213 people at work and 28 rental homes, the Campaign screen read 'Doors knocked 1,172' by election day, from the player's 3 hours a week plus three volunteers. On the first evening 54 doors gave 31 signatures while the same screen said '9 voters have heard from you'. Seen: the Campaign screen's Doors knocked and voters-heard figures.

**Cause.** Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026): Doors knocked 54 (Jan 23), 145 (Feb 2), 1,011 (Mar 3), 1,172 (Mar 7). Needs the count traced: doorsKnockedCount on the campaign row (src/core2/modules/campaigns.ts, CampaignRow) appears to count each visit, including the same home again and the volunteers' doors, while the screen's label reads as homes.

**Fix.** Find whether doorsKnockedCount counts visits or homes. If visits, either count each household once (the doors table already keeps them) or label it as visits through Fable A; either way the number must not pass the town's households for homes.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** An effect is a read: the doors table is the record; the screen reads it. No new words without Fable A.

**Done when.** A second session campaigns in a drawn small town on main for the whole race and the Campaign screen's door count never passes the town's households, and agrees with how many voters heard from the candidate.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts
