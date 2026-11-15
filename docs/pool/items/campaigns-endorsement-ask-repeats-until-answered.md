---
id: campaigns-endorsement-ask-repeats-until-answered
title: "An endorsement ask the player has not answered is asked again every campaign turn"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9525
after:
blocked-on:
lead: effects
model: sonnet
effort: medium
root: none
source: "Playable-page thread's Salado play, Nov 15, 2026 (39 asks in one council campaign at c43bf7e0)"
---

**What.** The endorsement ask to the player kept one row per candidate, but the row said `asked` both for an ask not yet answered and for a put-off, and the renew path re-asked any `asked` row after the offer spacing (7 days). A campaign turn is about nine days, so an ask the player never answered came back every turn until the vote. At Salado, Texas (seed review1:2) the run counted 48 asks from eight candidates, one of them nine times. Seen: in the player's scene queue during a council campaign.

**Cause.** Found in code: src/core2/modules/campaigns.ts, `askPlayerForEndorsement` (the held `asked` row is re-asked once due) called from `askForSupport` each turn. The row had no value for a put-off, so a put-off and silence were the same.

**Fix.** A stall reply writes `put-off` and the day on the row (`answerEndorsementAsk`); only a `put-off` row is asked again, after the offer spacing from that day, and the second asking offers no put-off; an `asked` row waits and emits nothing more; nothing asks once the vote is held. No cap and no typed number.

**Time box.** 2 hours.

**Rules.** No dice: the ask returns by the player's own put-off and the date, not by chance. A person asked once has answered or waits for an answer.

**Done when.** A second session plays Salado, Texas (a drawn place, draw review1:2) through a council campaign on main without answering and sees one ask per candidate (8, down from 48), then puts one ask off and sees it asked again once; and at Loving, New Mexico (3544420) a candidate asks once in 150 unanswered days and the open ask closes with its race.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/director/endorsement-ask-scene.test.ts
