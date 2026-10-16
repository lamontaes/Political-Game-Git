---
id: people-officeholder-journal
title: "The officeholder's journal: taking office, a vote, an interview, a town hall"
area: director
kind: feature
priority: 2
status: done
claimed-by: claude/people-officeholder-journal
pr: #4511
blocked-on: "words-and-director journal data"
milestone:
source: "overnight pool item 4; reissue closed note"
claimed-at: 2026-10-15T23:10:57.480Z
---

**What.** Taking office, a vote cast, an interview and a town hall never appear in the player's 'My life' journal, even though the office-day engine records each as an act. Add journal rows for each so the journal tells a council member's year in first person from the records. The journal data for these rows is the Words session's (`words-journal-subjects` and the journal bank). The player would notice his journal saying 'I was sworn in', 'I voted against the budget' and 'I sat down with the reporter', each tied to what happened.

**Rules.** No hand-written player text: the English engine writes the words from `data/english/parts/journal.json`; no entry is typed by hand; An effect is a read, not a record: the journal reads the office-day act records at the moment it writes; Ask why: each entry cites the act record it came from; The chain is the acceptance: follow one vote from the act record to the journal line the player reads; Sliding scales and causes: an entry's weight follows how much the event mattered, with no threshold flip; One rule, all 56 places: no place or office named in code; Replace, never layer: no parallel office log is kept beside the journal.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a year as a council member shows an entry each for taking office, a vote, an interview and a town hall in the journal, each citing its act record id. Tests in `src/director/journal.test.ts` and `office-scene.test.ts`. The owner plays it: serves a year and reads it back in his journal.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, src/core2/office-day-acts.ts, data/english/parts/journal.json

**Notes.** Waits on the Words session's journal data.
blocked-on 'words-and-director journal data' is not a pool id as of 2026-10-15; see words-journal-subjects (in-pr #4465).
