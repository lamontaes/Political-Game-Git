---
id: people-no-shared-school-or-work-between-people-at-the-start
title: 'No two people in a new game are on record as former schoolmates or coworkers, so nobody ever asks "Remember that school?"'
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: Story, Nov 10, 2026, on issue 7365, while writing the four different answers for everyday talk; filed by Fable
---

**What.** A talk can open on a school or a job two people shared. Story reports that in early play it never does: no world starts with former coworkers or schoolmates on record, so the questions "Remember that school?" and "Still there?" and their answers are never offered. A 17-year-old in a town with one high school should have schoolmates all around them.

**Cause.** Needs cause. Looked at: the talk asks `sharedHistory` (src/core2/shared-history.ts line 199) for the rows two people share (src/director/conversation.ts line 1161) and offers the shared-school and shared-work subjects only from those rows. Not yet known: whether `sharedHistory` returns nothing at the start because the past's school and work rows are written per person with nothing joining two people, because only the player is a full person with a past at the start, or because the rows exist and the talk's rules filter them out. Nobody has counted the rows in a new world.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session, to find the cause and rewrite this item with it. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** An effect is a read, not a record: a shared school counts only when a talk reads it and offers the subject. Two-level population: nobody is filled in to make a pair; a pair exists where both are already full people and the records say they overlapped. One rule, all 56 places.

**Done when.** A second session starts a new game on main in a drawn place it names with its seed, talks to three people of about the player's own age who went to the town's school, and is offered a subject about the school they shared in at least one of those talks; Trace on that reply opens the school's record. A test in a drawn place counts, at the start, the pairs of full people `sharedHistory` returns a row for, and the count is not zero where the town has a school.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/core2/shared-history.ts, src/core2/past-school.ts, src/core2/past-work.ts
