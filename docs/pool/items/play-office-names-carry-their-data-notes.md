---
id: play-office-names-carry-their-data-notes
title: "A statewide office's name carries its seats, terms and form in parentheses, so a calendar reads Filing opens for Corporation Commission (5 members, statewide, staggered 4-year terms)"
area: gov
kind: bug
priority: 2
size: S
status: merged
claimed-by:
pr: 9435
blocked-on:
standard: 2
model: sonnet
effort: low
lead: governing
root: none
source: Second words reader on #9404, Nov 15 (Tombstone AZ, Brownwood TX, Merrill WI calendars)
claimed-at:
after:
checked:
---

**What.** Twenty-five statewide and territory offices in the research record carried a note in their title (seats, terms, "nonpartisan", "spring election", "new office, first elected 2026 on ticket with governor"), so every screen that prints the office's name printed the note too. Two print paths stripped it at print time. Seen: the Calendar's filing lines at Tombstone AZ, Brownwood TX and Merrill WI.

**Cause.** Found in code: data/research/offices/state-offices.json held the notes inside the `title` string, and `stateOffices` in src/core2/offices-state.ts copies `title` to the office the screens read; `officeInSentence` in src/core2/person-work.ts and `seatSaid` in src/english/journal-words.ts each dropped a parenthesis at print time, so the calendar, which does neither, printed it.

**Fix.** Delete the note from each title so the name is the office's name alone (the seats, staggered, termYears, notes and `partisanElection` fields already hold what the note said; the two facts only the title held, Montana's other name and Wisconsin's spring election, went to the row's `notes`), delete the two print-time strippers and their test cases, and add a test that no office title, body name or government name of any state or territory has a parenthesis.

**Time box.** 2 hours.

**Rules.** The name is data in its own field; nothing strips a note at print time.

**Done when.** A second session, in a played world at a place and seed nobody chose, reads the filing lines on the Calendar and the Politics tab and sees every statewide office named by its name alone; the test over every state and territory passes.

**Waits on.** Nothing. Statewide boards read as one seat (seats 5 on the record, 1 office seat built) is item gov-statewide-commission-seats-not-read.

**Files.** data/research/offices/state-offices.json, src/core2/person-work.ts, src/english/journal-words.ts, src/core2/office-names-plain.test.ts
