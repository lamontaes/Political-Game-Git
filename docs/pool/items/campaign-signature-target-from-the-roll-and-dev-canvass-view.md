---
id: campaign-signature-target-from-the-roll-and-dev-canvass-view
title: "Size the signature target from the roll, not a picked half, and show each canvass visit in dev mode"
area: elections
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: campaign-page-silent-on-what-doors-ask-and-rival-door-visits
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: Account lead walk at Lisbon and strike measurement, Nov 16, 2026
---

**What.** The doors gather signatures until the clerk's count plus half again (`petitionSignatureCushion` 0.5, ESTIMATED from three news anecdotes). The clerk's own check strikes only signers who are not on the roll that morning. Played to the check with the player knocking daily: Otisville NY (seed 580915c5) needed 23, target 35, signed 150, struck 2; Brooklyn CT (seed 8e72e9e7) needed 25, target 38, signed 118, struck 0. Lisbon ND needed 102 and the target was 153 while the doors, at about 20 a day, ran 40 days to reach it. Dev mode cannot show who canvassed whom, when, and who said yes. Seen: the Campaign page's signatures line, the Knock card's ask and the dev-mode screens, which show the petition count and no canvass visits.

**Cause.** Found in code: `signaturesToGather` (src/core2/modules/campaigns.ts) multiplies the clerk's count by `1 + petitionSignatureCushion`; `checkPetition` (src/core2/modules/voting.ts) strikes only signers off the roll. Measured as above: struck 2 of 150 and 0 of 118. The doors do switch at the target (Otisville Feb 5: doors stopped at 33 of 35; the other 117 signed through the player's circle).

**Fix.** The target is the clerk's count plus the signers off the roll today plus the roll's churn over the days left (deaths, moves, aging in or out), read from the roll; delete the cushion row and every reference. Add a dev-mode race view over `canvassOfContest`: each campaign's households, first and last knock, who heard, and the yeses newest first with who knocked, the day and how firm, beside the petition count view. Tell the circulators owner before the gap's size changes.

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; sliding scales and causes; every number from a table or the record. An effect is a read, not a record.

**Done when.** A second session plays three drawn places on main and reads petition size, days to the target and signers struck at the check, with who made the ballot unchanged for every world candidate that made it before, and opens dev mode's race view to see each campaign's visits.

**Waits on.** The petition thread's dev-mode edits (Petition count) accepted.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/data/campaigns/parameters.json, src/bench/dev-mode.ts, src/bench/dev-api.ts, src/bench/ui/dev-campaign.mjs

**Notes.** Account lead, Nov 16. The reader `canvassOfContest` and its test are held by the Account lead worker and land with this item.
