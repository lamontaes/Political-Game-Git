---
id: words-family-loss-heavy-gift-needs-a-giver
title: "After a lost race, a household that gave most of its savings is heard"
area: director
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: words-family-loss-size-said-once-by-its-record
source: Account lead's ruling on pull request 9512 (no hand-staged gift), Nov 15
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A household that put most of what it had into a lost race says nothing different from one that gave a little more than a token.
The four statements written for a heavy gift ("You put our money in, and I'd do it again", "Our money went in, and we lost") were deleted from the pull request that added the gift-size variants, because no played world makes such a gift.
Seen: pull request 9512, where every candidate's own gift in its played places came through that same call and none read large against the household's year.

**Cause.** Found in code: the only writer of a candidate's own gift is `contributeOwnMoney` in src/core2/modules/campaigns.ts, called by the player's "contribute" action in src/bench/campaign.ts with an amount the player chose; the game's other people never put their own money into a race, so a gift that reads large against a household's year (`gift-size` above about a tenth) exists only if the player picks it.

**Fix.** Play it as the player does: a new life files, presses "contribute" through the bench handler with most of the household's cash, loses, and the household's talk after the loss reads the `family-loss.large` variant. Add the variant row back to src/director/data/arc-variants.json (weight 1.2 on `gift-size`, `onlyFor` stake gave) and write the statements fresh with the Words lead, each shown said in a played scene at a named place and seed.

**Time box.** 3 hours for a Sonnet session.

**Rules.** No hand-set gift: the amount goes through the bench handler. A statement no played scene says is not shipped.

**Done when.** A second session sees, in the running game at a place drawn from all 56 (name the place and seed), that a played life that gave most of its cash to its own race hears the heavy statement in the talk after the loss, and the pinned test src/director/family-loss-stake-scene.test.ts names the scene's record id.

**Waits on.** Pull request 9512 folding.

**Files.** src/director/data/arc-variants.json, data/english/parts/scene-talk.json, src/director/family-loss-stake-scene.test.ts (new)

**Notes.** Filed Nov 15 by hand on the branch of pull request 9512.

Nov 17, Words read of pull request 9512 (merged head): the opener "That was a lot to spend and lose. Talk to me." plays for a gift of about $700 (Murtaugh ID, seed read-9512-a), $1,200 (Shiloh GA, read-9512-f) and $2,300 (Murtaugh), and only a gift of about $100 reads small; the bands follow the record's own read (`gift-size`), so a design note for the Words lead: whether a mid gift needs its own wording is a question for the record's read, not a new cutoff.
