---
id: campaign-page-silent-on-what-doors-ask-and-rival-door-visits
title: "While the clerk checks, nothing tells the player what a knock asks for"
area: elections
kind: wiring
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: Account lead walk at Lisbon, Nov 16, 2026 (Feb 3 to Mar 26 played in the browser)
---

**What.** A new life at Lisbon, North Dakota (`jpr-pin:15`, place key 3847100) filed Feb 3 and met its petition Feb 19 (112 of 102). From then until Mar 26 the Campaign page said "112 of 102, enough for the ballot", and the Knock on doors card still read "Asking for: Signatures". Each knock still brought in signatures (112 on Feb 24, 133 on Mar 24, about 20 a day) and no yes for the vote; the count stood at 133 of 153 on Mar 26, so doors never turned to the vote in the window. Nothing on the trail, the Campaign page, the Calendar, the Journal or the News said that doors now ask for the vote only after the campaign's own cushion over the clerk's count is met, or that canvassing for votes had not started. Rivals are shown only as a total: "So far 214 voters have heard from Mark", Mar 24, up from 183 on Feb 24. The one other sign was a voter's line on Feb 5, "Mark Park's people knocked on my door this week". Seen: the Campaign page and the Knock card on every day Feb 19 to Mar 26.

**Cause.** Found in code: `petitionAsksAtDoors` (`src/core2/modules/campaigns.ts:3557`) keeps a door asking for signatures until the count reaches `signaturesToGather` (the clerk's 102 plus half again, 153, from `petitionSignatureCushion` 0.5), and the Knock card's "Asking for" line names that ask without saying why or what comes next. The Campaign page's rival lines read a reach count. Not read: whether a record of each rival visit (who, which door, which day) exists to read; the doors record kinds (`doors`, `word`, `told`) at `campaigns.ts:7438` are the first place to look.

**Fix.** The Knock on doors card says, from the petition record, how many signatures are in, how many the clerk asks for, the count the doors gather to and what the door is asked now and after. Owner's ruling Nov 14 stands: the doors switch themselves. The dev-mode view of each canvass visit and the cushion are the item `campaign-signature-target-from-the-roll-and-dev-canvass-view`.

**Time box.** 4 hours for one Opus session.

**Rules.** An effect is a read, not a record (`standing-rules-self-check`): the dev-mode view reads the same records the screens read. One engine per mechanic: no second tracker.

**Done when.** A second session plays a drawn place (Lisbon ND, `drawPlace("jpr-pin:15", "journal-player-race:15")`) on main from the filing to the petition's target and reads, on the Knock card, why doors collect signatures and when they turn to the vote.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/bench/data/controls.json

**Notes.** Account lead, Nov 16. Rival canvassing is visible before election day only as a running total and as a voter's remark; the per-visit record is not shown anywhere a player or dev mode reaches.
