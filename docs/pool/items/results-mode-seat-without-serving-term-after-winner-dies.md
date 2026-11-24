---
id: results-mode-seat-without-serving-term-after-winner-dies
title: "A seat can be left with no serving term after its winner is gone"
area: elections
kind: bug
priority: 3
size: S
status: open
after:
blocked-on:
source: "Account lead G1 measure for the #8606 fix, Nov 14, 2026"
lead: governing
standard: 2
model: opus
effort: low
root: none
---

**What.** In a world skipped four years, the seat of a winner of the 2026 general election was found with no serving term at the end of the skip. Seen: the office card and the government's list of who holds each seat, which would show the seat empty.

**Cause.** Needs cause. Looked at: the test `src/core2/results-mode-elections.test.ts` (from #8606) failed at Pascoag, Rhode Island (4454460, run seed ee55ff6600112233) on the merge of #8606 with train 49e8f924: `U.S. Senator on 2026-11-03: a serving term on the seat: expected undefined to be truthy`, read with the `bySeatStatus` query for status serving on the contest's seat at the end of four skipped years. On the later train (5fc60b90) the same seed passes, so the world no longer shows it; at the election's day after, skipped and played both had a winner. What is not read: whether the winner died or left and the seat was in a vacancy with no appointment yet, or whether the term was never made. A third read: src/core2/modules/offices.ts for what ends a term and what fills a vacancy in results mode.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session to find the cause and write it here.

**Rules.** One rule, all 56 places. Find it by drawing places and waiting, and name each passed over (skill `drawn-place-tests`).

**Done when.** A second session finds a skipped world with a seat that has no serving term, names the place and seed, and sees it written here with a cause of `Found in code:` or `Measured:`.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/core2/results-mode-elections.test.ts

**Notes.** Filed by hand on the Account lead's branch (pool add pushes to main).
