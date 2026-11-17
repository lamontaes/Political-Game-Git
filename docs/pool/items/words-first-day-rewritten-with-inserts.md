---
id: words-first-day-rewritten-with-inserts
title: "The first day at work says what the records hold: the employer, the job, the hours, who had the job before and who owns the place"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 10000
after:
blocked-on:
root: rc4-hand-written-words
lead: story
model: sonnet
effort: medium
source: owner, Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"
---

**What.** The first-day scene held 100 fixed lines for a generic workplace ("The inventory. It's in the back, and it hasn't been counted since spring.", "You'll find their coffee mug in the drawer.") that no record of the employer, the job or the hours placed, and the same boss, coffee and phones at every job in every town. The scene now talks from the new job's own records.
Seen: a player who takes a job meets a coworker on the first day who names the employer, the job, the day's hours, the owner where the business has one, the worker who held the job before and how they left, and a first job against a job after another.

**Cause.** Found in code: 97 of the 100 `first-day-ropes` pieces in data/english/parts/scene-talk.json carried no `requiresFacts`, `excludesFacts` or `onlyWhen` (two with a slot, one needing `asked_out_of_work`, which no code sets), and `composeBinding` in src/director/purpose-scene.ts set no fact from the job the `money:job-started` moment stands on. The `first-day` type also lists `school` among its settings and a `peers` role of classmates, but its only cause is a job, so its school half never fires.

**Fix.** Delete every first-day line placed by nothing and write the families from src/director/first-day-facts.ts (`firstDayFacts`, called from `composeBinding`): the employer, the job's title, the usual day's hours and a shift past midnight from the work calendar, the business engine's owner, the opening the hire filled and how its last worker left (`openingFilledFor` and `howWorkerLeft` in src/core2/modules/jobs.ts), the crew in words, the coworker's time there, a first job or the last employer, and pay below the middle for the title. Two TUNABLE rows in src/director/data/director.json. Lower scene-talk's count in tests/guards/english/line-inserts-baseline.json.

**Time box.** 5 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets from a record, and none is typed in code. Wire to the world: each fact reads the jobs, business or work-calendar engine's own rows, so a line plays only where its record holds.

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session runs a world until a worker takes a job, presses every reply in the first-day scene, and finds the employer, the job and the hours are the job and calendar records' by id, a boss line plays only where the business engine names an owner, a previous-holder line names the opening's replaced worker, and no line gives advice about getting on (the mentor's scene, weeks later). The line-inserts count for scene-talk is lower than before.

**Waits on.** None.

**Files.** data/english/parts/scene-talk.json, src/director/first-day-facts.ts, src/director/purpose-scene.ts, src/director/data/director.json, src/core2/modules/jobs.ts, src/director/first-day-reads.test.ts, scripts/words/first-day-walk.ts, tests/guards/english/line-inserts-baseline.json

**Notes.**

- 2026-11-17 (Story lead's builder, Sonnet): built on claude/story-first-day. The school half of the `first-day` type has no cause record; left alone, for the Story lead to file if a school-start record exists.
