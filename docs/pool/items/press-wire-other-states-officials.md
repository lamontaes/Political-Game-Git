---
id: press-wire-other-states-officials
title: "The local paper prints other states' officials taking office and leaving seats"
area: words
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In a played year, Blunt, South Dakota's paper printed 'A new State Senator from Florida took the oath of office.' 12 times and 'A new State Representative from New Jersey took the oath of office.' 12 times; Cogswell, North Dakota's printed Florida's too. src/core2/press-topics.ts wireItem takes facts.level as the wire level when a record carries one (line 96) and never checks that a state-level record is the town's own state, so every state's oaths and vacancies reach every town's paper. Measured with scripts/dialogue-batch/paper-year.ts, seed paper-nov1 (words-paper-and-journal-everyday-life step 1, Nov 1).

**Rules.** One rule, all 56 places: coverage is the town, its county, its state and the nation, read from the record's place, never a named state. Wire to the world: the fix is in the press's coverage, not in the words.

**Done when.** In a played year of three drawn places, no paper prints a state-level oath, vacancy or seat change from a state other than the town's own (named with place and seed), and src/bench/printed-words.test.ts passes.

**Files.** src/core2/press-topics.ts,src/core2/press-public-facts.test.ts

**Notes.** lead: words. Filed by the Words session from the paper-year measurement; the CTO routes it.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. `wireItem` in src/core2/press-topics.ts (lines 110 to 135) now returns null for a took-office or seat-vacated record on a seat outside the town's governments (`isOutsideOffice`) and routes another state's act to the nation level, with the comment naming the Florida-oath-in-Blunt case. Not replayed in a game.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).
