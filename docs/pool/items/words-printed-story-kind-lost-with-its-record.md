---
id: words-printed-story-kind-lost-with-its-record
title: "A printed story whose record the world does not keep loses its kind and is dropped from News without a word"
area: words
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
source: Desk, Nov 16, the address tests' reds on the Train (printed-words.test)
---

**What.** A birth printed by a town's papers from another place comes out with no words, and News leaves it out without a sign. The press desk knows the story was a birth; the reader of printed stories guesses the kind from the record's id instead. Over one played year at Baldwinville, 11 of 1,662 printed stories were lost this way, all of them births.
Seen: Baldwinville, Massachusetts, seed 502259e66d651f5a88b2ad4626a91b6a9fa572c6, a state lawmaker's baby wired statewide to 11 papers.

**Cause.** Found in code: src/bench/printed-words.ts `printedFacts` reads the source record from the durable log, and src/core2/state.ts keeps a public record there only for a place the player can see. For a record it does not find, `printedFacts` takes the kind from the id's first part. A birth's id is `${baby.id}:birth` (src/core2/modules/renewal.ts), so the kind read is the baby's id, no builder matches, and `wordPrintedStory` returns null.

**Fix.** In `printedFacts`, where the record is not kept, read the kind the press desk printed the story as (`printedStoryOf`, src/core2/modules/press.ts) when a builder exists for it, else fall back to the id as before. The player sees the birth in News in every paper that ran it.

**Time box.** 1 hour, one Opus session at medium effort.

**Rules.** Ask why: every printed story is worded from the record the press desk printed it from, never guessed from an id.

**Done when.** In a drawn place with a seed nobody chose, a played year loses no printed story to a missing record (counted by kind before and after), and a second session sees a birth from another place in News in the running game.

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts
