---
id: core-long-run-speech-retellings-fold
title: "A speech's retellings are kept forever, 182 thousand rows by year 8 of one save, though nothing reads one after the speech's day"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: speed/speech-retellings-fold
pr: #6922
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T07:38:04.221Z
---

**What.** The speech engine (src/core2/modules/speech.ts) keeps one retellings row per listener of every speech, with no date, and never drops them: in one Ringgold, Louisiana save (speed:year seed long-1) with the other folds in, they reach 182,416 rows by year 8, the third-largest table. A sweep of every reader (speed lead's workflow, Oct 30) found that nothing in play reads a retelling after its speech's own day: src/bench/campaign.ts speechGive reads today's speech, and src/director/civic-roles.ts casts the audience the day the speech is heard. The governing lead, who owns the speech engine on the governing chain, confirmed it (07:31 UTC) for main and its five open branches.

**Rules.** Speed and the Oct 30 01:55 bar (records kept stay flat over a save); CTO, Oct 30 04:14: a fold keeps what play reads, with each reader's window agreed by its owner.

**Done when.** Each day the retellings of speeches given speechRetellingKeptDays before (a TUNABLE parameter, 30) are dropped, found through a byDate index on addresses with no scan, and the speech's address row stays; src/core2/speech-retellings-fold.test.ts shows the retellings kept through the last day and gone the day after; a 2-year speed:year run of seed long-1 on main and on the branch differs in dev mode's records proof only in speech.retellings, with the rows in the PR body.

**Files.** src/core2/modules/speech.ts, src/core2/data/speech/parameters.json

**Notes.** TODO
