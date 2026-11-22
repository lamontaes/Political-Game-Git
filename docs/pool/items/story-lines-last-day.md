---
id: story-lines-last-day
title: "A last day at school or at work plays again as a scene that names the school or the job"
area: words
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by: claude/story-lines-last-day
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), pre-office order step 2, home life (bank 6a); pattern B6-05 (docs/story/scene-patterns.json)
checked:
---

**What.** On the last day at a school, the classmates staying say goodbye; on the last day at a job, the coworkers do. The cut of Nov 17 left the scene silent, and its packet carried only names, so no line could say what was being left. Seen: the end of a school year and a job's last day, before office.

**Cause.** Found in code: `composeBinding` in src/director/purpose-scene.ts set no fact for the scene's cause records (`school.finished`, the ended job row). The lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17), so `last-day` was in `CUT_PURPOSES` in src/director/scene-talk.test.ts.

**Fix.** `lastDayFacts` in src/director/last-day-facts.ts names the school, or the employer and the job, each cited to its record. The scene's lines are written in `data/english/parts/scene-talk.json` for both causes, keyed by `school-day` or `work-day`. `last-day` leaves `CUT_PURPOSES`.

**Time box.** 2 hours.

**Rules.** No hand-written player text in code: every line is a bank row. Ask why: each fact cites its record. The player says only what they chose, and no reply promises an act no ending records (`last-day-farewell` has no promise ending).

**Done when.** A second session, in a drawn place and seed in the running game (dev mode allowed), plays a last school day and a last day at work, each naming the school or the employer from its record; scene-talk.test.ts and last-day-facts.test.ts pass; every new pair and narration has a verdict.

**Waits on.** Nothing.

**Files.** src/director/last-day-facts.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Nov 19 (Story): the lead built the facts. A Sonnet helper wrote 86 rows, and the lead took out the coworker's follow-up question, which could end a talk on a question (rule 108). A fresh Haiku reader judged the pairs, every plant caught. The lead read the 6 narrations. `src/director/school-goodbye-scene.test.ts` found no last school day in 200 days at four drawn places on the cut; that staging is not looked into here.
