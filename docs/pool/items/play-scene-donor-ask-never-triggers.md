---
id: play-scene-donor-ask-never-triggers
title: "A donor's ask never plays: no campaign gift became a moment for a watched candidate in three drawn worlds"
area: director
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

**What.** The batch 4 capture tried to play the director's `donor-ask` scene (a donor comes to a candidate asking for something back) in three worlds drawn from all 56 places: Flagler Beach, Florida (1222550, seed `batch-4-nov-9:0`), Oceanport, New Jersey (3454570, seed `batch-4-nov-9:1`) and New Albany, Ohio (3953970, seed `batch-4-nov-9:2`). Only Oceanport had a race to file for (an Assembly seat); its candidate had bills pending before the body and ran to the count, and no gift became a moment for them. The other two worlds had no open race for a seat on a town body in the played months. Only the bribe offers, which share the donor's arcs, were played. The type fires from a `campaign-gift` record that names the watched candidate (`money:event:campaign-gift`, `causeRecord: campaign-gift` in `src/director/data/situation-types.json`) or from `cause.donated` on the street. Seen: a donor comes to the candidate with a gift and an ask in the played game, a scene in the Journal and on the street.

**Cause.** Needs cause. Looked at: the type's two causes in `src/director/data/situation-types.json`, the earlier item `words-donor-ask-scene` (done: it made each gift a public record) and the capture's three worlds. Not traced: whether a gift is written at all for a watched candidate in a played year and, if it is, why the director's moment for it did not match (the label, `selfNamed`, or `candidateId` equal to the subject). The cause find settles which record should fire the type (a gift to the player, or to a person in their circle who is running) and why none did, in a run of a candidate who files and campaigns, named by place, seed and record id.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session, for the cause find. When it runs out, write what was ruled out into this item's Notes, set the item's state honestly with a one-line note, and stop.

**Rules.** Each of these is a play bug, its own item (CTO, Nov 12, 2026). No dice: the situation fires from a record, never a chance. Wire to the world: the cause is a record an engine writes in a played year. One rule, all 56 places: the cause find draws places and names each place and seed. Simulate it, don't ask.

**Done when.** A second session, in a drawn place and seed the cause find did not choose, plays the world and sees the scene stage from its record, named by record id, and play out in the game (through dev mode where the cause is a wait on a record), and names the place and seed it saw it in; the item's Cause then reads `Found in code:` or `Measured:` with a Fix.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/core2/modules/campaigns.ts, src/director/ledger.ts

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026, on the CTO's call on #7365: the six kinds of scene batch 4 could not trigger are play bugs, each its own item. No existing open item covers this kind; related items are named in the Cause.
