---
id: words-reads-wrong-nov10-b
title: "New baby, apology and story-read lines stand on what was said before them"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: story/reads-wrong-nov10-b
pr: pending
blocked-on:
lead: words
source: "second read-through of the Nov 10 scenes: the five that the first pass could not print in play (new baby, race told, apology, accusation, story-read), composed by their own tests on two seeds"
claimed-at: 2026-11-10T13:00:00.000Z
---

**What.** New baby (seeds 201 and 203), story-read (211, 212), race told (221, 222), apology (231, 232) and accusation (241, 242), every filled line of each scene's tree printed and read. Found and fixed, keys unchanged:

1. A new baby's "Go. {kid} and I will be fine." and "Go. I've got {kid}. Take two hours." answered any request, including "Could you do the dishes while I sit with {kid}?". They now follow only a request to take the baby for a sleep or a nap.
2. A new baby's close "Then I'll put the groceries away and get out of your hair." put away groceries that only one opening brought. It no longer names them.
3. The apology follow-ups "I believe you're sorry..." and "Sorry helps..." answered every reply, including ones that never said sorry. They say only what they need.
4. Two story-read lines credited "what they decided" to nobody. They now say "the change on {story}", as the narration does.

Race told and accusation read clean on both seeds (no name tag, stranger, "this town", article, lowercase opener or unsaid reference found); the closers in story-read repeat across a tree because the bank has few ("Okay. Go. We'll pick it up some other time.").

**Done when.** src/director/reads-wrong-scenes.test.ts passes: a new-baby "Go." follow only follows a request that hands over the baby for a sleep or nap, no new-baby close names groceries, no follow to an owed apology presumes one was made.

**Files.** data/english/parts/scene-talk.json, src/director/reads-wrong-scenes.test.ts

**Time box.** 1 hour.

**You will see.** After "Could you do the dishes while I sit with Priya?": "Done. Sit down, and I'll take care of the rest."
