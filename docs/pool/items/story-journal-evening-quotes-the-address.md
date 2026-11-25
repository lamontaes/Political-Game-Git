---
id: story-journal-evening-quotes-the-address
title: "The Journal's first evening can quote the line of the address the player remembers"
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
lead: story
model: sonnet
effort: medium
root: none
source: "CTO, Nov 24 19:54Z (7142760180 on #10377): file each missing fact as an engine item for its owner; the Story lead's question, 7142124378 on #10377"
checked:
---

**What.** The Journal writer (W3) can say what the President's address was about, but not a line from it. So the evening section repeats the theme in every life, while the line each player remembers differs and sits on record. Seen: the Journal's first page, where it tells the address.

**Cause.** Found in code: the address's sentences and the line the player remembers are on record as `address:said` and `address:remembered-at` (src/director/opening-story.ts:917-925). `rememberedOf` (src/director/address-render.ts:222) reads them for talk (src/director/conversation.ts:3344) and for the paper (src/bench/printed-words.ts:4013). `eveningChapter` on story/first-evening (src/director/journal-evening.ts:101-214) carries the theme and the question but never reads `rememberedOf`.

**Fix.** In journal-evening.ts, read `rememberedOf` and carry the remembered line as a `quote` fact with the address's record id. W3 writes the lines. Out of scope: floor and campaign speeches keep no text (`speech.heard` keeps topic and occasion only, src/core2/modules/speech.ts:240-312), so a Journal line that quotes those needs its own item.

**Time box.** 1 hour.

**Rules.** An effect is a read, not a record: the Journal reads the address's own `address:said` record and never renders the speech again. No hand-written player text: the quote is the record's own sentence.

**Done when.** In a played world at a drawn place, the first evening's packet carries a `quote` fact equal to the line `rememberedOf` returns, by the address's record id. A second session sees the Journal quote the line the player remembers once W3's lines are in.

**Waits on.** Nothing. The code is on story/first-evening until it merges.

**Files.** src/director/journal-evening.ts (new), src/director/address-render.ts
