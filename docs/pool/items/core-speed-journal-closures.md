---
id: core-speed-journal-closures
title: "The cash journal's checks are module functions, not closures made for every posting; prior counters are copied only when bookkeeping reads them (records identical)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The cash journal is 7.9 s of Gunnison UT's election year (key 4932660, seed n8f6) and allocates about 9 GB a year. projectCashJournal made four checking closures for every posting (hundreds of thousands a year, each named at run time by the transpile), and postCashJournal copied each owner's and account's prior totals into a list that only the bookkeeping checks read.

**Rules.** Exact (CTO, Nov 9 7:40 p.m.): the records proof is identical; only timing differs. The same checks run with the same messages. No dice.

**Done when.** speed:year on Gunnison, Utah (key 4932660, seed n8f6) and Dickey, North Dakota (seed n8g7), four years each, on main and the branch on the same commit with --same-records gives identical fingerprints every year, with the timed pairs and a same-commit profile of the journal in the PR body.

**Files.** src/core2/journal.ts, src/core2/journal-state.ts

**Notes.** TODO
