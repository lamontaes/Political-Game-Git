---
id: story-lines-on-ramp-2
title: "A resident's question at a town hall, the ask to speak at a rally, and a mentor's word on a run are written again"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-on-ramp-2
pr: 10165
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), pre-office order step 3, on-ramp and involvement (patterns A01, A04, A10 in docs/story/scene-patterns.json)
checked:
---

**What.** Three more scenes on the road into politics, which the cut of Nov 17 left silent: a resident asks the player a question at a town hall, a neighbor asks the player to say a few words at a rally, and an officeholder of the player's party weighs in on a run. Seen: the first months of a new life, from the first town hall to the decision to run.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skipped `town-hall-question`, `rally-word` and `advice` by name in `CUT_PURPOSES`. The mentor's advice packet carried no party or filing deadline.

**Fix.** Write each scene again as rows in `data/english/parts/scene-talk.json` from its pattern; give the mentor's advice the party and the filing deadline from the party's ask record in `composeBinding`, each cited to its record id. Each scene leaves `CUT_PURPOSES`.

**Time box.** 4 hours.

**Rules.** Every line of four words or more carries an insert, and a slot carries the fact the line is about, never padding (owner, Nov 14). No figure aloud; narration says only what is seen. Every scene is built from a real-lives pattern (owner, Nov 18).

**Done when.** A second session, in a drawn place, is asked a question at a town hall, is asked to speak at a rally, and hears a party mentor on a run, each talk naming what its record holds; the English guards hold no new red; every new reply pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts, src/director/advice-facts.test.ts, src/director/scene-talk.test.ts, tests/support/scene-talk-fixture.ts

**Notes.** Nov 18 (Story): written by a Sonnet helper; 192 pairs judged by a fresh reader, every plant caught; 9 narrations read by the lead. The engines' scenes differ from the patterns (the town hall's player is the host, the rally's player an official, the mentor speaks of a run, not a job); the advice scene's work-mentor cause sets no office and is skipped.
