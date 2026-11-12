---
id: words-morning-talk-looks-ahead-from-records
title: "Talk at home in the morning looks ahead to the day from its records"
area: words
kind: feature
priority: 2
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc4-hand-written-words
milestone:
source: "words composer unit 2 (#8879): with small talk held to a finished day and a stand needing a cause, mornings at home offer no talk in three drawn places (Wofford Heights, California, seed a9c85de3-e7fa-4418-8499-569a5c5e6e10; Big Foot Prairie, Illinois, seed dd6c71d0e69c09ff5445; South Londonderry, Vermont, seed cca43462c993fa4ec58c)"
size: M
checked: fable 2026-11-12
---

**What.** Every small-talk line in `data/english/parts/conversation.json` (subject `quiet`) is an end-of-day line ("Busy one at work today?", "I'm beat. Just glad to be home."), so #8879 holds small talk to a day that is over (`quietDay`, the listener's shift ended or it is evening). In the morning a housemate with nothing on record now offers no talk (owner, Oct 24), which is right; but a morning has records of its own that people do talk about: the shift ahead (its start from `workSpansOnDateV1`), a school day, an appointment, a filing deadline, a hearing or a vote on the calendar. Seen: on a work morning at home, pressing Talk on a housemate gives nothing at all.

**Cause.** Found in code: data/english/parts/conversation.json (the talk bank) has no morning subject and no line that looks ahead to a day from a record; `quietDay` is the only subject made from the clock.

**Fix.** Add a subject to `subjectsBetween` (src/director/conversation.ts) made from today's records ahead of the minute (the listener's shift start and place, a school day, a calendar entry the offices or elections engines keep), ranked like small talk (below anything with a record of its own, once a week per person), and its lines, written by the Story session with inserts (the shift's start, the place, the meeting), for the morning and the afternoon. No line assumes a day; each needs its record.

**Time box.** 2 hours.

**Rules.** standing owner rules (no dice, one rule all places, wire to the world); words skill: small talk loses to anything with a record, words know the hour and the person.

**Done when.** `src/director/home-talk-fortnight.test.ts` played in three drawn places shows a morning talk on at least three mornings in two weeks, each naming its record (a shift start, a school day or a calendar entry), and still holds every rule it holds today; a second session starting a new life in a drawn place and talking to everyone at home at 7:00 a.m. on a work day hears at least one line about the day ahead that names its record.

**Waits on.** nothing.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json (Story writes the lines), src/director/home-talk-fortnight.test.ts

**You will see.** On a work morning a housemate says something about your shift or theirs ("You're on at nine today?") instead of nothing.
