---
id: story-lines-home-and-work
title: "Eleven home and work scenes are written again from bank 5, each naming what happened"
area: words
kind: feature
priority: 1
size: L
status: in-pr
standard: 2
claimed-by: claude/story-lines-pre-office
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), pre-office first, home and work life from bank 5 (docs/story/scene-patterns.json, B5-01 to B5-05)
checked:
---

**What.** The scenes of a life before office, which the cut of Nov 17 left silent: a layoff and the friend's call about the lost job, the first day at a new job, the day after school ends for a graduate and for a senior who did not pass, a partner asking to move in, a proposal, a breakup, a visit to a sick relative, a funeral, and the talk after someone was rescued. Seen: the household and work scenes of a new life's first years.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skipped these situations by name in `CUT_PURPOSES`. Their packets carried only the people and the town, so a writer could only pad with names (`director-scene-packets-carry-their-cause`, built here).

**Fix.** Write each scene again as rows in `data/english/parts/scene-talk.json` from its bank-5 pattern, each line naming what its record holds: the employer, the workplace as people say it ("the clinic"), the position and the years held; the school and its short name; how long two were together and the child at home; the illness and how long it has run; who died. The full employer or school name is said at most twice a talk. Each scene leaves `CUT_PURPOSES`.

**Time box.** 6 hours.

**Rules.** No figure aloud; every line of four words or more carries an insert from the record, and a slot carries the fact the line is about, never padding; narration says only what is seen. Every scene is built from a real-lives pattern (owner, Nov 18).

**Done when.** A second session plays a layoff, the day after school and one family scene (move-in, proposal, breakup, care, funeral or rescue) in drawn places, and each talk names what its record holds; the English guards hold no new red; every new reply pair and narration has a fresh reader's verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.test.ts, tests/support/scene-talk-fixture.ts

**Notes.** Nov 18 (Story): two Sonnet helpers wrote the scenes from the kit; the Story lead sent each back twice (fact slots stuffed into every line, the position used as a thing, the school standing in for "it", thin stock fallbacks, closes that threatened). 533 pairs judged by fresh readers, every plant caught; 56 narrations read by the lead, three deleted for giving a history no record holds.
