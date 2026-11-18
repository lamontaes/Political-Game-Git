---
id: story-lines-on-ramp
title: "The first steps into politics are written again: a neighbor's cause, the party's ask to run, its welcome, and filing at the counter"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-on-ramp
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), pre-office order step 3, on-ramp and involvement (patterns A05, A11, A12, A13 in docs/story/scene-patterns.json)
checked:
---

**What.** Four scenes on the road into politics, which the cut of Nov 17 left silent: a neighbor asks the player to a meeting about a cause, the party asks the player to run, the party welcomes the player after they join, and the clerk reads the player's filing at the counter. Seen: the first weeks of a new life, from the first cause to the filing.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skipped these situations by name in `CUT_PURPOSES`. The party's ask carried only the office and the town, and the cause invitation never read the posted meeting.

**Fix.** Write each scene again as rows in `data/english/parts/scene-talk.json` from its pattern. Give the party's ask the party's name and the filing deadline from its record, and the cause invitation the next posted meeting through `nextMeetingFacts` (src/director/meeting-facts.ts), each cited to its record id, in `composeBinding`. Each scene leaves `CUT_PURPOSES`.

**Time box.** 4 hours.

**Rules.** Every line of four words or more carries an insert, and a slot carries the fact the line is about, never padding (owner, Nov 14). No figure aloud; narration says only what is seen. Every scene is built from a real-lives pattern (owner, Nov 18).

**Done when.** A second session, in a drawn place, is asked to a cause's meeting and hears its day and place, is asked by the party to run and hears the party and the deadline, and files at the counter, each talk naming what its record holds; the English guards hold no new red; every new reply pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts, src/director/scene-talk.test.ts, tests/support/scene-talk-fixture.ts

**Notes.** Nov 18 (Story): written by a Sonnet helper, sent back once (the cause said in every line, the town padded in), with the two packet facts added; the lead deleted three lines (a reason in narration, an invented excuse).
