---
id: legislature-sign-on-ask-reaches-only-close-ties
title: "The player can ask only colleagues they are close to to sign on to a bill"
area: gov
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
claimed-at:
after: scene-bill-sign-on-colleague-ask
blocked-on:
lead: words
source: "brief V, stage 2 (co-sponsor ask); account lead ruling, Nov 14, 2026, 17:19Z (no unplayed lines in the bank)"
model: sonnet
effort: medium
root: rc6-scenes-repeat
---

**What.** When the player drafts a bill, the sign-on ask goes only to colleagues the player is already close to. A player cannot go to a member across the aisle, a member of another wing of their party, or someone they barely know and ask for their name, so the reasons such a colleague would give (a wing that is against it, "I don't owe you anything") never play, and their lines were taken out of the bank. Seen: the colleagues asked after Draft on the seat screen are only the player's close ties.

**Cause.** Found in code: `signOnCandidates` (src/core2/modules/legislature.ts) keeps only members with `closenessBetween(player, member) > 0`, sorted by closeness and total, up to `cosponsorsMax`.

**Fix.** Let the player choose whom to ask from the chamber's members (a seat-screen action next to Draft), or widen the candidates past close ties, and write the wing and standing lines back with a played no for each. Decide which with the Words lead; the ask staying the player's own press is the owner's rule.

**Time box.** 3 hours for one Sonnet session.

**Rules.** No figures in talk; nothing cast for the player without their press. No new stopgaps.

**Done when.** A second session plays a state legislator in a drawn place, asks a colleague they are not close to to sign on, and sees that colleague answer, with a no that names their wing or that they owe the player nothing, matching the colleague's position parts in dev mode.

**Waits on.** scene-bill-sign-on-colleague-ask.

**Files.** src/core2/modules/legislature.ts, src/bench/legislature.ts, data/english/parts/scene-talk.json

**Notes (stages of a bill, Nov 14, 20:45Z).** Measured: `src/director/bill-sign-on.test.ts` (removed) at #9305's head 7bbf4958, 240 asks in each place. Manteca, California (0645484, world seed 1d3c1565): 206 signed. Wilmont, Minnesota (2770582, world seed 2cb5aaf1): 221 signed. Wiggins, Colorado (0884770, world seed ae49513e): 204 signed. That is about nine in ten, because only close ties are asked. The owner's calibration ruling (Nov 14, relayed 20:14Z) is to establish what makes a member sign, not to tune a rate. It names party, the member's own view, the district, ties, and who else is on the bill. The ask reads the first four from records (`memberPosition` and `signOnRecord`). It does not yet read **who else is on the bill**: the cosponsors already signed, and whether a member of the other party or of the member's own leadership is among them. That belongs in this item's fix next to widening the candidates. Account lead, 20:37Z: the ask should also reach colleagues who are not close, who then say no for a reason on their record.
