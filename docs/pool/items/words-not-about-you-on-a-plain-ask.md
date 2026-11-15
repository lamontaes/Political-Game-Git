---
id: words-not-about-you-on-a-plain-ask
title: '"It''s not about you" is a colleague''s first answer to a plain ask to sign on, where nothing said it was about the player'
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
source: Second reader on #9369 (Nov 15 19:48Z, Wiggins); filed by the story builder (bill stages)
standard: 2
model: sonnet
effort: low
root: none
---

**What.** Asked plainly to sign on to a bill, Vicki Robles answers first "It's not about you. I just don't believe in it." Nothing the player said, and nothing on the record between them, suggests the player thinks it is about them, so the first half answers a question nobody asked. Seen: the sign-on ask, the colleague's first answer.

**Cause.** Measured: src/director/bill-sign-on.test.ts, Wiggins, Colorado (0884770), world seed ae49513e298f622a71fda8adda6349ac0c00be6118d727dfce1779fc3546f57a, at #9369's head a9ac28f7. Found in code: the piece `scene-talk.reply-refuse.it-s-not-about-you-i-just-don-t-believe-in-it` (data/english/parts/scene-talk.json) is placed by `no-views` alone (the reason set in `composeBinding`, src/director/purpose-scene.ts, from `memberPosition`), on any refusal whose worst term is views, with no fact for a strained tie or a player who took it personally.

**Fix.** The Words lead decides: place the piece only where the record holds a strained tie between the two (a fact read from the relationship the scene already loads), or reword it without "It's not about you". The player sees it in the sign-on ask's first answer.

**Time box.** 1 hour.

**Rules.** Lines are the Words lead's; a piece is never reworded only to pass a check.

**Done when.** A second session runs src/director/bill-sign-on.test.ts at the drawn place Wiggins, Colorado (0884770), that world seed, in a played world built by buildBenchWorld, and the first no from a colleague whose reason is their views does not say "It's not about you" unless the record holds a strained tie.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts
