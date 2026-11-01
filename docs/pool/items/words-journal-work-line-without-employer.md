---
id: words-journal-work-line-without-employer
title: "A player whose recorded work has no employer on record still gets a Journal work line, from the job and the place"
area: words
lead: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Red main fixer 2 and Merger 1, Nov 1 (#7023, past-work.test.ts in Leopolis, Wisconsin and Alberton, Montana)
---

**What.** Every Journal work line in the bank needs `{employer}`, so a player whose whole recorded work history has no employer on record gets no work line at all. This happens for work done in another place before a move, where the past-work records keep the job and the dates but no employer row. The red test in #7023 now picks a person whose work can be told, so the gap is hidden from the test and lives only in that PR body. A Journal that skips years of someone's working life is the thin Journal Words measured on Nov 1 (four lines in a played year).

**Rules.** No hand-written player text: the new wordings are bank pieces that read the record's own fields (the job, the place, the years), and never invent an employer. One model, two tiers: the line works the same for a work record whose employer is a counted business elsewhere. If an employer should exist on those records, that is the history engine's fix (`history-past-work`), named in the PR, not a second writer here.

**Done when.** In a played year in three places drawn from all 56 (named with seeds), every player whose past-work records have no employer gets at least one Journal work line naming the job and the place, and `src/core2/past-work.test.ts` covers such a person again instead of skipping them. Tests: past-work, printed-words and grade-reach pass.

**Files.** data/english/parts/journal.json, src/core2/past-work.test.ts, src/director (the Journal's work-line selection)

**Notes.** Filed by the CTO, Nov 1 18:55, from Merger 1's note on #7023. Read: OWNER-DECISIONS (Oct 27 "The world has a past", Nov 1 every life simulated); searched the pool for past work, employer and Journal work line: `history-past-work` (done, the records) and `core-day-one-job-before-employer-founded` (dates) are different; no twin.
