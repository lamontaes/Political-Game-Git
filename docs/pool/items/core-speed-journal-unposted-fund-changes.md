---
id: core-speed-journal-unposted-fund-changes
title: "A cash posting builds account changes in play only for the accounts it posts to (one owner's 112 funds on every posting)"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: low
root: rc5-full-detail-every-day
lead: speed
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** projectCashJournal (src/core2/journal.ts) builds a change record for every fund of every touched owner on each posting, though in play only the posted accounts' changes are read: the totals and latest records loop over the posted accounts, and since core-speed-journal-portfolios-in-play (#6131) the fund writes skip funds that did not move. In Long Hill, Connecticut (seed m7b) one jurisdiction owner with 112 funds gets 7,959 of 57,967 owner postings in 60 days, so the projection allocates about 111 unused records each time, some 5 million a year. The sums over every fund stay, since the residual needs them. With bookkeeping on, the checked path keeps every record for the receipt copy and its checks. Seen: the game running, a year taking under two minutes (it cuts about 5 million allocations a year in a town with a 112-fund owner).

**Cause.** Found in code: src/core2/journal.ts `projectCashJournal` (line 192) builds a change record for every fund of each touched owner on each posting; the item reports 7,959 of 57,967 owner postings in 60 days in Long Hill, Connecticut (seed m7b) hit one jurisdiction owner with 112 funds, about 5 million unused records a year (sums over every fund stay, the residual needs them).

**Fix.** Build change records in play only for the posted accounts (keep one for a posted account with a zero delta, `deltas.has`); with bookkeeping on, keep the full checked path. Prove deep fingerprints identical in Long Hill (m7b) one year and Stanardsville, Virginia (cc91f5444b53bd47) three years.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: a town's year runs in under two minutes; an exact cut keeps every record identical. Bookkeeping is a debug switch: checks and copies run with it on, not in play. No dice: every engine reads the same records in the same order.

**Done when.** A second session, not the builder, plays buildBenchWorld in drawn places, Long Hill, Connecticut (seed m7b, one year) and Stanardsville, Virginia (seed cc91f5444b53bd47, three years) and every deep fingerprint is identical before and after; projectCashJournal's self time in a Long Hill CPU profile falls; src/core2/journal-state.test.ts and the other journal tests and the accounts and finance tests pass.

**Waits on.** Nothing.

**Files.** src/core2/journal.ts, src/core2/journal-state.test.ts

**Notes.** Filed Oct 26 by the speed lead while reviewing #6131. Build it on that branch (claude/speed-journal-portfolios-in-play): main's fund writes still read every fund's change record. A posted account can carry a zero delta, so the record is kept for every posted account (deltas.has), not only for those that moved.

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/speed-journal-unposted-funds` is kept; claiming this item takes it over.
