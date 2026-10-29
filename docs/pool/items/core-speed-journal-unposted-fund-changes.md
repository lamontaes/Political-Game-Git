---
id: core-speed-journal-unposted-fund-changes
title: "A cash posting builds account changes in play only for the accounts it posts to (one owner's 112 funds on every posting)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** projectCashJournal (src/core2/journal.ts) builds a change record for every fund of every touched owner on each posting, though in play only the posted accounts' changes are read: the totals and latest records loop over the posted accounts, and since core-speed-journal-portfolios-in-play (#6131) the fund writes skip funds that did not move. In Long Hill, Connecticut (seed m7b) one jurisdiction owner with 112 funds gets 7,959 of 57,967 owner postings in 60 days, so the projection allocates about 111 unused records each time, some 5 million a year. The sums over every fund stay, since the residual needs them. With bookkeeping on, the checked path keeps every record for the receipt copy and its checks.

**Rules.** Speed: a town's year runs in under two minutes; an exact cut keeps every record identical. Bookkeeping is a debug switch: checks and copies run with it on, not in play.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) every deep fingerprint is identical before and after; projectCashJournal's self time in a Long Hill CPU profile falls; src/core2/journal*.test.ts and the accounts and finance tests pass.

**Files.** src/core2/journal.ts

**Notes.** Filed Oct 26 by the speed lead while reviewing #6131. Build it on that branch (claude/speed-journal-portfolios-in-play): main's fund writes still read every fund's change record. A posted account can carry a zero delta, so the record is kept for every posted account (deltas.has), not only for those that moved.

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/speed-journal-unposted-funds` is kept; claiming this item takes it over.
