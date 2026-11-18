---
id: jobs-adult-outside-the-labor-force-has-no-seeker-record
title: "A jobless adult at home has no record of looking for work, so a housemate says nothing about it"
area: core
kind: stopgap
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
source: "Words builder A, Nov 14, 2026, from #9247 and the readers' notes"
model: opus
effort: medium
root: none
---

**What.** A jobless housemate says nothing of looking for work. The jobs engine keeps job offers only for the person the player controls, and an adult out of the labor force has no seeker row, so no application, interview, rejection or benefit paid is on record for a talk to read. This is the registered stopgap SG-DIRECTOR-housemate-job-search-unrecorded. Seen: a jobless housemate tells, in an ordinary talk, how the search for work is going.

**Cause.** Found in code: src/core2/modules/jobs.ts keeps seeker rows and offers for the controlled person only (`startRegionalWork` and the offers table in that module); `rentDue` and the day subjects in src/director/conversation.ts read only what a record holds; the stopgap row is in src/director/data/stopgaps.json (SG-DIRECTOR-housemate-job-search-unrecorded, addedBy Words builder, Nov 12).

**Fix.** Have the jobs engine record, for every jobless adult who seeks work (full people and counted households alike, one rule), the newest application and its answer, or the benefit paid from the income engine, and let the talk read the newest as a job-search subject. Delete the stopgap row and its marker in the same PR. Owner of that engine on this account: the builder of the jobless-stock work (#9271).

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a record nobody else reads is an unregistered placeholder, so the talk reads it. One model, two tiers: a counted group is read by the same rule as a full person, times its count. No dice. A record nobody reads is a placeholder: the talk is the reader.

**Done when.** A second session, in a drawn place with its seed named, plays the case on main through the screens a player reaches and sees the result in the player's words, by record id.

**Waits on.** nothing.

**Files.** src/core2/modules/jobs.ts, src/director/conversation.ts, src/director/data/stopgaps.json
