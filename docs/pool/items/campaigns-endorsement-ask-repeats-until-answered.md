---
id: campaigns-endorsement-ask-repeats-until-answered
title: "An endorsement ask the player has not answered is asked again every campaign turn"
area: elections
kind: defect
priority: 1
size: S
status: in-pr
claimed-by:
pr:
blocked-on:
source: "Playable-page thread's Salado play, Nov 15 (39 asks in one council campaign at c43bf7e0)"
lead: effects
claimed-at:
standard: 2
---

**What.** The endorsement ask to the player kept one row per candidate, but the row said `asked` both for an ask not yet answered and for a put-off, and the renew path re-asked any `asked` row after the offer spacing (7 days). A campaign turn is about nine days, so an ask the player never answered came back every turn until the vote. At Salado, Texas (seed review1:2) the run counted 48 asks from eight candidates, one of them nine times.

**Cause.** src/core2/modules/campaigns.ts, `askPlayerForEndorsement` (the held `asked` row is re-asked once due) called from `askForSupport` each turn. The row had no value for a put-off, so a put-off and silence were the same.

**Fix.** A stall reply writes `put-off` and the day on the row (`answerEndorsementAsk`); only a `put-off` row is asked again, after the offer spacing from that day, and the second asking offers no put-off; an `asked` row waits and emits nothing more; nothing asks once the vote is held. No cap and no typed number.

**Done when.** At Loving, New Mexico (3544420) a candidate asks the player once in 150 unanswered days, and a put-off comes back once; at Salado (review1:2) the asks fall from 48 to 8, one per candidate, and one put-off is asked again once.

**Time box.** 2 hours.

**Model and effort.** Sonnet, medium.

**Files.** src/core2/modules/campaigns.ts, src/director/endorsement-ask-scene.test.ts

**Notes.** Built in the endorsement-ask fix PR.
