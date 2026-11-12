---
id: play-scene-state-of-the-town-given-never-triggers
title: "A State of the Town or State of the State the player gives never plays: the player is not a mayor or governor in a played year"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: "batch 4 capture, Nov 9, 2026 (the item words-batch-4 and its page, kept on the closed pull request #8071, section 'Kinds that could not be triggered'), sent to the pool by the CTO, Nov 12, 2026, on #7365 (comment 6825983162)"
checked:
---

**What.** The batch 4 capture tried to play an address the player gives as mayor or governor. The address engine (`composeLocalAddress` in `src/director/local-address.ts`) writes the mayor's and the governor's address from the town's term, and `recordLocalAddress` records it; the player is not a mayor or governor in a played year, so the batch held an address heard (scene `address`, one Continue per part, no choices) and the speech the player builds by parts (`speech-builder`), and no address the player gives. Seen: a player who holds a mayor's or governor's office gives the address of the year and chooses what it says.

**Cause.** Needs cause. Looked at: `composeLocalAddress` and `recordLocalAddress` in `src/director/local-address.ts` and the batch's worlds. Not settled: whether an executive office held by the player reaches the address engine as the speaker (and in which drawn place, with what seed, a player holds such an office in a played year at all; the golden path reaches council and mayor), whether the address is meant to play as a heard scene or as the player's own speech builder, and which record should fire it. The cause find settles which record fires the address and why it did not fire for the player, by place, seed and record id.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session, for the cause find. When it runs out, write what was ruled out into this item's Notes, set the item's state honestly with a one-line note, and stop.

**Rules.** Each of these is a play bug, its own item (CTO, Nov 12, 2026). No dice: the situation fires from a record, never a chance. Wire to the world: the cause is a record an engine writes in a played year. One rule, all 56 places: the cause find draws places and names each place and seed. Simulate it, don't ask.

**Done when.** A second session, in a drawn place and seed the cause find did not choose, plays the world and sees the scene stage from its record, named by record id, and play out in the game (through dev mode where the cause is a wait on a record), and names the place and seed it saw it in; the item's Cause then reads `Found in code:` or `Measured:` with a Fix.

**Waits on.** Nothing.

**Files.** src/director/local-address.ts, src/director/data/situation-types.json

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026, on the CTO's call on #7365: the six kinds of scene batch 4 could not trigger are play bugs, each its own item. No existing open item covers this kind; related items are named in the Cause.
