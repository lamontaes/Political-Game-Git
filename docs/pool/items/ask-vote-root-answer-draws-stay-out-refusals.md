---
id: ask-vote-root-answer-draws-stay-out-refusals
title: "A colleague asked for their vote can answer the ask itself with a no meant for being asked to stay out of the room"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "stages of a bill, Nov 15, 2026, playing the second vote ask for #9369 at Banks, Idaho"
lead: words
---

**What.** When the player asks a colleague for their vote, the colleague's first answer can be "I can't trade on this one." or "If I'm not there, they'll know why. No." These are lines for when the player asks them to stay out of the room or offers a trade, and nobody has done either yet. Before #9369 it played at Banks, Idaho (drawSeed probe-va-0, world seed 68cbcd7f) on 2025-03-03: Parker Sandoval answered "Ordinance 2025-9 comes down to a vote or two. Yours is one of them." with "If I'm not there, they'll know why. No." (#9369 now places the asked-before no there.)
Seen: the colleague's first answer in the evening-before vote ask.

**Cause.** Found in code: the three stay-out refusals in `data/english/parts/scene-talk.json` (`scene-talk.reply-refuse.no-i-have-to-be-on-the-record-on-this-one`, `...i-can-t-trade-on-this-one`, `...if-i-m-not-there-they-ll-know-why-no`) are placed with `after: "request"`. In `src/director/scene-talk.ts` the colleague's first answer is worded with `after` set to the player's opening move, which is `state: request`. The player's later "just don't be there" is also a `request`. So `useFit` (`src/english/scene-talk-words.ts`) cannot tell the opening ask from the stay-out ask, and a line with `after` scores higher than one without.

**Fix.** Give the stay-out ask its own move (for example `absent-ask`) in the `ask-vote` arc's `again` list and on the bank's follow pieces, and place the three refusals after it. Or place them by `afterPiece` on the stay-out lines instead of by move. Prove at Banks, Idaho that the first answer to an ask is never one of the three. No line is reworded.

**Time box.** 2 hours.

**Rules.** No line is reworded only to move it; the words session's review (`Review: words`) and M5's pair verdicts for any placement that changes. One rule, all 56 places: the fix is in the arc and bank, never a place.

**Done when.** A second session plays a town council member in a drawn place (place and seed named) with a bill that needs votes, and on the evening before the roll asks a colleague for their vote: their first answer is never "I can't trade on this one.", "No. I have to be on the record on this one." or "If I'm not there, they'll know why. No.", and those three still answer "Then don't vote against it. Just don't be there."

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/data/purpose-arcs.json, src/director/scene-talk.ts
