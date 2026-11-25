---
id: words-address-records-venue-and-audience
title: "An address records where it was given and to whom, so the paper can say it"
area: words
kind: wiring
priority: 2
size: S
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
source: "CTO, Nov 24 19:54Z (7142760180 on #10377): file each missing fact as an engine item for its owner; the Story lead's question, 7142124378 on #10377"
checked:
---

**What.** The news writer (W5) has run out of true facts for the address ledes: a paper can name who spoke, the day and a remembered line, but never where the address was given or who it was given to (a joint session of Congress, the legislature, the council and the public). So the ledes in every life say the same thing, and the sameness gate's part 2 fails for want of a fact, not a wording. Seen: the paper the morning after the President's address or a governor's or mayor's address.

**Cause.** Found in code: no address record says where or to whom. The joint address is written with `placeId: lawChain(api).townPlaceId` and its facts are only the statements (src/core2/office-day-federal-president.ts:618-626). The opening address and a governor's or mayor's address take the player's own place, and their witnesses are the player's household (src/director/opening-story.ts:894-905, src/director/local-address.ts:365-371). The packet builders `jointAddress`, `address` and `localAddress` (src/bench/printed-words.ts:2905, 3887, 4008) pass no place or audience. The only venue anywhere is the news picture's guess from the speaker and kind (src/bench/news-picture.ts:107-115).

**Fix.** On each of the three address events, write a `venue` fact (where it was given) and an `audience` fact (whom it was given to), read from the records of the office and body that host it, never typed per place. Carry both in the three builders as `place` and `audience` facts with the event's id. Make news-picture.ts read the same venue fact instead of guessing. The news writer writes the lines; `data/english/parts` is Story's.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places: the venue comes from records, never a named place. Replace, never layer: the picture's guess goes in the same change. No hand-written player text.

**Done when.** In a played year at a drawn place, the paper after the President's joint address and after a governor's or mayor's address carries `place` and `audience` facts naming the hosting body, by record id. A second session sees a lede that names where and to whom once W5's lines are in.

**Waits on.** Nothing. The lines wait on W5.

**Files.** src/core2/office-day-federal-president.ts, src/director/opening-story.ts, src/director/local-address.ts, src/bench/printed-words.ts, src/bench/news-picture.ts
