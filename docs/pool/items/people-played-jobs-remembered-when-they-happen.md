---
id: people-played-jobs-remembered-when-they-happen
title: "A job a person takes or leaves in play is written to their life record the day it happens, and the card no longer reads the jobs engine's change rows"
area: people
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
standard: 2
lead: lives
model: sonnet
effort: medium
root: design-life-record
source: stand-in triage, Nov 10, 2026 (SG-PEOPLE-played-jobs-read-at-open)
claimed-at:
---

**What.** When a card opens, the life record reads the jobs engine's change rows (hire, quit, retired, closure) and turns each into a sentence by a hand-set table. A hire by an outside region is not told, and a person back in the counts is told only from rows their id keeps. Every other thing a person goes through is written when it happens; jobs should be too.

**Cause.** Found in code: src/core2/person-life.ts line 335 (function playedJobs, marker constant PLAYED_JOBS_STOPGAP at line 288) calls stopgap(SG-PEOPLE-played-jobs-read-at-open) and maps jobEnding(kind, reasonKey) from the "changes" table of the jobs module; src/core2/data/life/remembered.json remembers only work.job-lost and person.work-spell, and src/core2/modules/jobs.ts emits no hire or separation record the people module listens for.

**Fix.** Have the jobs engine emit one core event for a hire and one for each separation (quit, retired, moved, closure) naming the person, employer and day, add their rows to remembered.json so the people module keeps them like any other row, and delete playedJobs, jobEnding and the change-row reader. A hire by an outside region names the region. A counted person's job is kept as the group's record and told when they are filled in. Cost: one small event on the day a job changes, no daily scan.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace never layer: the old reader is deleted in the same change. No hand-written player text (the English engine words the lines). Two-level population. An effect is a read. Speed bar.

**Done when.** A second session, in a played year of buildBenchWorld in a drawn place (seed named), opens the card of a person who took a job and one who quit or was let go in play, finds each told with employer and day by record id from the remembered list, finds no change-row reader left in src/core2/person-life.ts, and SG-PEOPLE-played-jobs-read-at-open resolved in src/core2/data/stopgaps/people.json.

**Waits on.** Nothing.

**Files.** src/core2/person-life.ts, src/core2/modules/jobs.ts, src/core2/data/life/remembered.json, src/core2/data/stopgaps/people.json

**Notes.**
