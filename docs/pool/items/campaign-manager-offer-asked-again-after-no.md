---
id: campaign-manager-offer-asked-again-after-no
title: "Someone close who was turned down, or put off, asks again about running the campaign"
area: director
kind: feature
priority: 3
size: M
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
source: ruling on the manager offer, Nov 14 2026
checked:
---

**What.** In the manager-offer scene (#9158) a no, or walking away, leaves the helper off the campaign's staff, and nothing brings the offer back. The owner's side of it: nothing is decided for the player without their press, so a put-off should not read as a yes, and a person who really wants to run the campaign should be able to be asked again. Seen: after the player puts the offer off, a later scene or a button on the Campaign tab lets them say yes or no to the same helper.

**Cause.** Design: see docs/pool/items/campaign-manager-offer-never-stages.md (the scene this follows) and the owner's rule that the player's own choices are never made for them (docs/play-first/LAW.md). `offersToHelp` in src/core2/modules/campaigns.ts adds the one who offered to `managerWeighedIds` and never weighs them again, and `answerOffer` staffs the helper only on a yes. The stall reply was removed from the offer-to-run arc in #9158 because it promised a later answer the game does not stage. The fix is a way back to the same offer, on the same record, not a second offer engine.

**Fix.** Choose one and say which in the PR: (a) the helper offers once more after a period set in the campaigns parameter table, as the same `volunteer-offered` record kind with `role: manager`, only while the campaign has no manager and the race is more than a set time away; or (b) a button on the Campaign tab, "Ask <name> to run it", that opens the same manager-offer scene with the helper's willingness read from `managerReason`. Put the stall reply and its lines back only with this.

**Time box.** 4 hours for one Opus session at medium effort.

**Rules.** An effect is a read, not a record: the yes puts the helper on staff, which the cast and election night read. No dice: willingness is read from `managerReason` and the helper's traits. Review: words.

**Done when.** A second session plays a campaign in a drawn place, with the seed named, puts off the manager offer, and later is asked again or asks again, says yes, and sees the helper on election night as the campaign manager; record ids named.

**Waits on.** #9158 merged.

**Files.** src/core2/modules/campaigns.ts, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

**Notes.** Found while replaying #9158 with the Account lead's ruling of Nov 14.
