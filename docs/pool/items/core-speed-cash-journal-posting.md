---
id: core-speed-cash-journal-posting
title: "The cash journal's posting and projection cost about 12 of 210 profiled seconds in a dense town year"
area: core
kind: bug
priority: 2
size: M
status: blocked
claimed-by: claude/pool-cash-journal
pr:
blocked-on: journal-owner-design-batch-postings-per-day
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:43:25.293Z
---

**What.** A CPU profile of the played year in Long Hill, Connecticut (npm run speed:year -- --seed m7b --exclusive, 176.6 s unprofiled-by-wall, 210 s sampled) puts postCashJournal (journal-state.ts) at 5.9 s, projectCashJournal (journal.ts) at 4.0 s and portfolios (journal-state.ts) at 2.5 s self time, about 12 s together, beside 38.9 s of garbage collection. Find what each daily posting rebuilds or copies that it could update in place or index, and cut it without changing any balance.

**Rules.** Speed (AGENTS.md): no change may make a year more than 20 percent slower, and no daily scan of the whole world or a whole history; use indexes or act on the day something changed. Every dollar must still balance, and the check draws its place from all 56 and names it and the seed.

**Done when.** npm run speed:year -- --seed m7b --exclusive on one machine shows postCashJournal, projectCashJournal and portfolios together under 6 s self time in a fresh cpu profile and the year faster by at least 6 s, with the journal tests (src/core2/journal*.test.ts) passing in a drawn place with its seed named.

**Files.** src/core2/journal-state.ts, src/core2/journal.ts

**Notes.** Child of core-speed-year-over-limit-dense-town. Profile read Oct 20 with node --cpu-prof; GC is 38.9 s of 210 s and the rest is flat (no function above 6 s).

Released Oct 20 after reading `postCashJournal` (journal-state.ts 1137 on): it is a transactional, bigint-checked writer copying posting rows, capturing secondary markers and building a full projection per entry, about 5.7% of the profiled year. Halving it saves about 3% of the year, so batching postings per day (one projection for many same-source rows) is the only worthwhile cut and needs the journal owner's design; not started.
