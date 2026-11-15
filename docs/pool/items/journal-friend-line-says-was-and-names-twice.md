---
id: journal-friend-line-says-was-and-names-twice
title: 'The journal says "Sara Yoder was a good friend" of a friend who is alive, and says her full name twice in two sentences'
area: words
kind: bug
priority: 3
size: S
status: open
lead: words
standard: 2
model: sonnet
effort: medium
root: none
after:
claimed-by:
pr:
blocked-on:
source: second reader, Nov 15, Sherrodsville OH petition-short run
claimed-at:
---

**What.** In `/mnt/project-files/words-lead/petition-short/played-3369a8c1.md` (head 3369a8c1, place 3972242, seed `scan-25`, entry dated 2025-08-07) the Journal reads "Sara Yoder was a good friend. Sara Yoder became county prosecutor." "Was" reads as if Sara died or the friendship ended, and her full name is said in both sentences. Seen: in the player's Journal screen, My life.

**Cause.** Found in code: src/director/journal.ts (3643) and the memoir part `journal.memoir-remember.name-was-a-good-friend` ("{name} was a good friend.", field `remember`), the Train's tie-meaning line; it is written in the past tense for every tie, alive or not, and the sentence after it is the office line, which names the same person again because the two sentences are built separately and each says `{name}`. Nothing checks that the tie is still on at the day told.

**Fix.** Keep one wording that is right while the tie holds ("{name} is a good friend.") and the past one only when the tie record says it ended or the person died; the second sentence says the person once (the first sentence names them, the next says "She became county prosecutor" through the pronoun rule the composer already uses for a person named in the line before). Delete the wording it replaces from the bank.

**Time box.** 3 hours.

**Model and effort.** Sonnet, medium.

**Rules.** No hand-written text in code; words come from the bank. An effect is a read: the tense reads the tie record's state at the date told.

**Done when.** In a played world at a named place and seed, a friend who is alive and still a friend is told "is a good friend" and named once in the pair of sentences; a friend who died or whose tie ended is told with "was"; the replaced wording is gone from the bank; record ids named, and a second session sees it in the running game through the screens a player reaches.

**Waits on.** nothing.

**Files.** data/english/parts/journal.json, src/director/journal.ts, src/director/relation-facts.ts

**Notes.** Filed by the Journal builder (#9119 thread) at the Account lead's request, Nov 15; not part of #9119.
