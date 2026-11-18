---
id: story-lines-home-bank6a
title: "A far relative's letter, a missed birthday, a newcomer at work and a friend's ask play again as scenes"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-home-bank6a
pr: 10063
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), pre-office order step 2, home life (bank 5, then 6a); CTO, Nov 18 21:25Z, merge bank 6a into the cut; patterns B6-01, B6-02 and B6-03 (docs/story/scene-patterns.json)
checked:
---

**What.** After the cut of Nov 17, a resident played 240 days at Allendale, New Jersey (seed s1795031946) with no scene at all. On main, the same world staged a letter from a far relative and a birthday with a relative missing, and on the cut both fell to journal lines. This item writes those two scenes again, with a new hire who introduces themselves at work and a friend who asks the player along. Seen: the first evenings of a new life, before office.

**Cause.** Design: the four scenes' lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17), so `src/director/scene-talk.test.ts` listed `letter`, `gathering-missing`, `first-meeting` and `becoming-friends` in `CUT_PURPOSES`. Found in code: every out-of-town relative in the probe world is kept at the player's own county or state, and the letter's `hometown` fact (`letterFacts` in src/director/letter-facts.ts, from `destinationSaid` in src/director/purpose-scene.ts) named that county or state as a place to visit.

**Fix.** Write the four scenes from their patterns. Add `relativePlaceSaid` in src/director/purpose-scene.ts, which sets `hometown` only for a place elsewhere and sets `nearby` for a county or state that holds the player's town, read by the letter and the gathering. The four keys leave `CUT_PURPOSES`. The housemate's arrival and the first date get narration only; they wait on engine facts the packet does not set (listed in Notes).

**Time box.** 3 hours.

**Rules.** Wire to the world: each line names a fact its record holds, and `nearby` cites the relative's place record. No hand-written player text in code: the words are bank rows. The player says only what they chose (scene-standard rule 12).

**Done when.** A second session, in a drawn place and seed in the running game, plays a resident and is shown a relative's letter and a birthday with a relative missing, each from its record; a relative kept at the player's own county or state is said as nearby, never as a place to visit; `src/director/reunion-letter-scene.test.ts` and `scene-talk.test.ts` pass; every new reply pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts, src/director/letter-facts.ts, src/director/gathering-facts.ts, src/director/reunion-letter-scene.test.ts, src/director/scene-talk.test.ts, tests/support/scene-talk-fixture.ts

**Notes.** Nov 18 (Story): a Sonnet helper wrote 356 rows. The lead had the letter's `{hometown}` padding taken out of every reply, follow and close, and rewrote six lines that said one slot twice or answered no question. A fresh Haiku reader judged 808 pairs, every plant caught. The lead read 43 narrations, all passing. Engine gaps: `arrival` has no housemate facts (composeBinding, src/director/purpose-scene.ts), and `date` has no facts for `family.partnered` (src/core2/modules/people.ts).
