---
id: words-address-slot-drops-when-the-speaker-has-no-term
title: "The address slot drops out with its comma when the speaker has no name or term for the hearer"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words builder A, Nov 16 (the lead's read of Dundee, Mississippi, seed c3: "You try living on what I make, you.")
claimed-at:
checked:
---

**What.** A line that ends in the address slot says "you" when the speaker has nothing else to call the player, so the player reads "You try living on what I make, you." or "Fine, you." The slot should drop out together with its comma. Counted over data/english/parts: 128 pieces carry {you}, 73 end in ", {you}." and 55 carry it elsewhere in the sentence, none begin with it. Seen: at Dundee, Mississippi (2820420), seed c3 the line reads "You try living on what I make." with no trailing word.

**Cause.** Found in code: `calledBy` (src/director/conversation.ts, used by `youIn`) returns the plain word "you" when the speaker has no name or term for the player, and the composer fills the slot with it; the slot never drops.

**Fix.** In the composer that fills slots, a slot named you whose value is the plain word is left out with the comma before it (and the comma after it when it opens a clause), for every piece that uses it; `youIn` keeps its once-per-talk rule. The 128 pieces are read once for a sentence that would not stand without the word.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** Wire to the world: the fix is in the one composer that fills slots, proven in a played talk, never in each piece. Any piece that does not read without the word is listed for the Words lead.

**Done when.** At Dundee (seed c3) the line above drops the trailing "you"; a second session plays two talks with a speaker who has no term for the player in a drawn place from all 56 (name the place and seed) and finds no line ending ", you." in them.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/english/

**Notes.** The wage missing from that same piece (conversation.own-view-back-core.you-try-living-on-wage-an-hour-you carries requiresFacts wage but no wage slot) stays with words-own-view-back-reply-names-no-wage-or-employer.
