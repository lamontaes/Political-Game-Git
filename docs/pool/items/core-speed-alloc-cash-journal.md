---
id: core-speed-alloc-cash-journal
title: "Posting and projecting a cash journal entry allocates 7 GB (12 percent) of a dense town's year"
area: core
kind: cleanup
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-z
pr:
blocked-on: core-speed-journal-bigint
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:24:43.816Z
---

**What.** A sampling allocation profile of a played year in Long Hill, Connecticut (seed m7b, key 0943580, 365 days, 60,914 MB allocated including collected objects) put the cash journal first: postCashJournal 2,958 MB (4.9 percent), projectCashJournal 2,603 MB (4.3 percent), portfolios 1,389 MB (2.3 percent), volumes 869 MB, plusTotals and the Map and Set copies they make about 1 GB more, 8 to 9 GB in all. Every posting builds exact-arithmetic (BigInt) amounts, maps of volumes and portfolios, and copies of its totals for each entry. Cut that allocation, for example by keeping running totals in place and building a projection only when bookkeeping is on, without changing any amount or the balance checks.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Every dollar balances: the journal's sequence, source, balance and overflow checks always run, and the debits and credits it posts stay identical. One model, two tiers: counted groups and full people post through the same entry.

**Done when.** Run an allocation profile of seed m7b (Long Hill, Connecticut) before and after: the cash journal functions named here fall by at least a third of their bytes, the year's journal totals and the count of entries by reason are identical by record id, journal.test.ts and the accounts tests pass, and npm run speed:year -- --seed m7b --exclusive shows the saving as a function's inclusive time in a CPU profile, in the PR body receipts.

**Files.** src/core2/journal-state.ts, src/core2/journal.ts

**Notes.** TODO

Read Oct 20 (claude/political-game-pool-b6g0dl), nothing built. The first thing in the allocation is `portfolios` in journal-state.ts: for every owner a posting touches it walks the owner's complete account index and copies each account (`{ ...live, source: { ...live.source } }`) and checks the index is consistent. A town's residents owner holds one fund account per counted group, so one posting to it costs one copy per group, and the cost grows with the group count. Under `bookkeeping() === false` the consistency checks could go and only the posted accounts and the residual need a snapshot, but the residual's balance is the owner's cash less every other account's allocation, so the owner's allocated total has to be kept as a running sum first (and verified against the full walk in a test with bookkeeping on). That is the plan; it touches the conserving ledger, so it should go through a core-area session with the journal tests running first.
