---
id: words-door-lines-give-a-figure-as-the-reason
title: "At the door, a resident gives their rent as a dollar figure instead of saying how it feels"
area: director
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: door scenes builder (claude/project-thread-9d3ex7)
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: Second words reader on #9288's played file (Nov 15); Account lead routed it to the door scenes builder
---

**What.** At a plain door, asked what matters most, a renting resident answers with the figure: "Rent. We pay about $650 a month. Something has to give." and "I rent. It's {rent} a month. Don't mess with it." The second reader found it in the played file of #9288 at Kennebec SD (Jason Bolton). Seen: at a plain door, asked what matters most, a renter gives the dollar figure

**Cause.** Design: docs/design/words-machine.md; the owner's rule is that people say how it feels and never the figure (owners-words-to-threads). Found in code: the two pieces `scene-talk.reply-tell.rent-we-pay-rent-a-month-something-has-to-give` and `scene-talk.reply-tell.i-rent-it-s-rent-a-month-don-t-mess-with-it` in data/english/parts/scene-talk.json (door scenes, batch 2, #9187) say the `{rent}` slot that `doorViewFacts` in src/director/purpose-scene.ts fills from the household's lease. A search of every ask-signature and ask-support piece for a money slot, a dollar sign or a digit found only these two.

**Fix.** The Words lead's ruling (Nov 15): a voter at a door doesn't say the dollar figure. "Rent. We can barely make it. Something has to give." plays only where the rent is a heavy share of what the household brings in: the lease's rent against `householdIncome` (src/core2/modules/moves.ts), above the director's `directorRentBurdenShare` (HUD's 30 percent). The lead's second line, "I rent, and it goes up every year. Don't mess with it.", failed M5 on all five pairs (asking to leave a rising rent alone contradicts the complaint, and "it" names nothing), so it comes out and the "don't touch it" side of a renter waits on a new wording from the Words lead; its fact would be the housing engine's renewal record, whose last renewal raised the rent. The `{rent}` fact and slot come out of the door.

**Time box.** 1 hour, Sonnet.

**Rules.** No hand-written player text: the lines come from the bank and say only facts the scene's packet holds, and, per owners-words-to-threads, people say how it feels and never the figure, so a door line reads a record that backs the feeling instead of saying the dollar amount. Lines are worded by the Words lead or the second reader, not by the builder unjudged.

**Done when.** No door piece says a dollar figure or a money slot (the search in Cause comes back empty, checked by the door-variants test), and a played file of the played world at three drawn places, headed with the sha, shows a renting resident saying one of the two lines with the lease record id that backs it. A second session sees it in the game at a drawn place nobody chose.

**Waits on.** Nothing; the wording is the Words lead's.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts

**Notes.** Filed by the door scenes builder (thread "Write more door scenes"), Nov 15.
