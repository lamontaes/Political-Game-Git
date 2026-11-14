---
id: gov-player-taken-bribe-keeps-no-reasons
title: "When the player takes a bribe, nothing records why, so no one can later say why they took it"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: effects
model: opus
effort: medium
root: design-life-record
source: Found by the short-replies builder (#9262) staging a complaint over a bribe the player took, Nov 14, 2026; the Account lead asked for this item
---

**What.** When anyone else takes a bribe, the crime record keeps what weighed in their choice: how much the money meant to them, their money trouble and their tie to the person paying. When the player takes one in the bribe-offer scene, the record keeps nothing. So when the player is later accused, their own replies cannot give a reason: the talk can never say "I was behind on everything" or "it was a lot of money to me", though both are true of the player's own money at that moment. Seen: the accusation scene for a bribe the player took offers no reason, only the fact that they took it.

**Cause.** Found in code: `src/core2/modules/corruption.ts` `takePendingBribe` (about line 451) copies the pending record and sets `taken: true`, but the pending record was made in `considerBribe` with no `take` reasons. For the player's seat the take is not decided there (`toPlayer`), so `reasons.take` is never written. `motiveOf` (about line 398) then finds no values for the "take" side and returns null. `justice.ts` `motiveFact` adds no `motive`, and `purpose-scene.ts` sets no `motive-*` fact for the scene. Measured: Bryant, Illinois (seed c0ffee13, label short-replies-friend), two staged takes by the player (the scene's own `scene.reply` with ending `took-it`). Both complaints carry `accusedAs: "took"` and no `motive`.

**Fix.** When the player takes the money, keep the same circumstances `takeValues` reads for anyone else (`need`, `pressure`, `tie`, read from the player's own money and tie on that day) on the record's `reasons.take`. Those are the facts of the player's situation, not a choice made for them. `motiveOf` then names the one that weighed most, and the accusation scene reads it as it does for an offer.

**Time box.** 1 hour, Opus.

**Rules.** No dice: nothing is chosen for the player; the record keeps their circumstances. An effect is a read: the reasons are read by `motiveOf`, the complaint's facts and the scene.

**Done when.** In the played world (buildBenchWorld) at Bryant IL (seed c0ffee13) and one place drawn from all 56 (named with its seed), the player takes a bribe through the bribe-offer scene. The crime record holds `reasons.take`, and the complaint that names the player carries a `motive`, both named by record id. A second session sees the accused player able to say why they took it.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/justice.ts

**Notes.** Filed by hand on the #9262 branch, Nov 14. Lines waiting on it are in /mnt/project-files/words-lead/short-replies/conflict-accuse/deferred-motive-lines.md (motive-need, motive-pressure, and a taker's motive-tie).
