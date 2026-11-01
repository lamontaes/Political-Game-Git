---
id: words-after-address-talk-follows
title: "The talk after the President's address varies, uses the President's own pronoun, and every reply follows from what the player chose"
area: words
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:25 UTC
lead: words
milestone: play-first
---

**What.** Owner, Nov 1 playtest of v0.73.0, after the inaugural: the housemate opens with "I liked what the President had to say." every time ("There's only one dialogue for after the president... that's not how I approve this"). The choice "We'll see what they actually do." says they for a President whose record says she ("Why would it say they? Why not she?"). "What I want to know is what it means here." makes no sense, and the replies do not follow: "I don't see it that way" gets "Suit yourself. We can pick this up later.", and "what it means here" gets "That's what I keep wondering. We'll talk more later." Clicking him again asks "Did you catch the President's speech?" and loops back to the same opening line.

**Rules.** Scene standard: lines vary by the speaker's traits and tie to the player, and a scene writes something back. No hand-written player text: the pronoun is read from the President's record through the English engine. Every reply answers the choice it follows, and a talk that has been had is not offered again as new.

**Done when.** In three played openings in places drawn from all 56 (named with seeds), the first line after the address differs by speaker and stance across the three; a test fails on "they" for a President with a recorded gender; each choice's reply is read in the PR beside the choice it answers; and a second click on the same person does not replay the opening exchange.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** After the address, your housemate's first line changes with who they are, calls the President she or he as the record says, and every answer follows what you chose.

**Screenshot.** Three choices and their replies after the address, from a drawn place.

**Files.** data/english/parts/scene-talk.json, src/director/opening-story.ts, src/english/scene-talk-words.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest (Nov 1, 22:25 UTC, five screenshots, New Game). Read: OWNER-DECISIONS (Oct 29 02:35 opening montage and address; Oct 29 address "no real statistic in play"; Oct 26 one scene system), the pool for twins.
