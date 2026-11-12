---
id: people-no-shared-school-or-work-between-people-at-the-start
title: 'No two people in a new game are on record as former schoolmates or coworkers, so nobody ever asks "Remember that school?"'
area: people
kind: bug
priority: 2
size: M
status: merged
standard: 2
claimed-by: claude/pool-people-no-shared-school-or-work-between-people-at-the-start
pr: #8487
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: Story, Nov 10, 2026, on issue 7365, while writing the four different answers for everyday talk; filed by Fable
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:30:30.266Z
branch: claude/pool-people-no-shared-school-or-work-between-people-at-the-start
merged-at: 2026-11-12T18:26:25.954Z
---

**What.** A talk can open on a school or a job two people shared. Story reports that in early play it never does: no world starts with former coworkers or schoolmates on record, so the questions "Remember that school?" and "Still there?" and their answers are never offered. A 17-year-old in a town with one high school should have schoolmates all around them. Seen: the talk lines "Remember that school?" and "Still there?", which never play today.

**Cause.** Found in code: `sharedHistory` (src/core2/shared-history.ts, line 199) joins two people only through tables written in play. A shared school needs both to hold a row in the school engine's `attended` table (`attendedSchool`, line 54; written only for a student enrolled in play, src/core2/modules/school.ts lines 223 and 363) with the same school and exactly the same year. Shared work reads only the jobs in `core.jobs` (`sharedWork`, line 79). The simulated past writes each person's schools and jobs as records of their own: `school.started` (`SCHOOL_STARTED`, read by `schoolsAttended` in src/core2/past-school.ts) and `person.work-spell` (`PAST_WORK_SPELL` in src/core2/past-work.ts, with the employer's `organizationId`, `startedAt` and `endedAt`). `sharedHistory` reads neither, so two adults who went through the town's school in the same years, or worked for the same employer before the start, share nothing on record. The opening makes no schoolmate tie either: `openOpeningPeerTies` in src/core2/state.ts (line 271) marks stopgap SG-WIRE-PEOPLE-SCHOOLMATES with the comment that no schooling before the start is simulated, which is out of date. Read on main Nov 10; the rows were not counted in a run.

**Fix.** Make `sharedHistory` read the past as well: two people share a school when their `schoolsAttended` rows name the same school and their years there overlap (from each row's date and grade), and share past work when their `person.work-spell` records name the same employer with overlapping spans. Read only the two people asked about; build no index over the world. Then let the opening's peer ties (`openOpeningPeerTies`) make a schoolmate tie from the same reader for people in the same class, and clear SG-WIRE-PEOPLE-SCHOOLMATES. The talk's rules in src/director/conversation.ts (line 1162) already offer the subjects from these rows. Count the pairs in a new world before and after and put both counts in the pull request.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a shared school counts only when a talk reads it and offers the subject. Two-level population: nobody is filled in to make a pair; a pair exists where both are already full people and the records say they overlapped. One rule, all 56 places.

**Done when.** A second session starts a new game on main in a drawn place it names with its seed, talks to three people of about the player's own age who went to the town's school, and is offered a subject about the school they shared in at least one of those talks; Trace on that reply opens the school's record. A test in a drawn place counts, at the start, the pairs of full people `sharedHistory` returns a row for, and the count is not zero where the town has a school.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/core2/shared-history.ts, src/core2/past-school.ts, src/core2/past-work.ts

**Notes.** Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:30 UTC) on branch claude/pool-people-no-shared-school-or-work-between-people-at-the-start.
