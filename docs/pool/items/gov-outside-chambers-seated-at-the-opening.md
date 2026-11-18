---
id: gov-outside-chambers-seated-at-the-opening
title: "Every other state's legislators are seated as named officials at the opening, though their sessions keep only results"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/long-game-outside-chambers-unseated
pr: #9807
after:
blocked-on:
root: none
lead: governing
model: fable
effort: medium
source: Long game lane, Nov 17 (a case of tests-wide-races-three-cases-red-on-train; the CTO's ruling of 01:05Z on issue 9747)
---

**What.** At the opening, 5,632 of 7,412 other states' legislators get an official's key on their term and an official row, because every sitting legislature is opened that day. The CTO's ruling keeps them named officials on their term rows until someone meets them or their detail is needed. Seating them all costs every opening time and memory.
Seen: Henlopen Acres, Delaware (1033900), seed pin-wr-0, by `npx vitest run src/core2/wide-races.test.ts`, the national pool case.

**Cause.** Found in code: `openSittingSessions` in src/core2/modules/world-legislating.ts (added by #7772) opens every sitting session at the opening, including another state's; `openOutsideSession` reads each chamber through `chamber`, whose `members` (src/core2/modules/legislature.ts) runs `holderOf`, and `seatOfficial` seats each member and writes the official's key onto the term in `seatAll` (src/core2/modules/officials.ts).

**Fix.** `openSittingSessions` opens only sessions that reach the town (the federal session and the town's own state's); another state's session is opened by its calendar entry, as it was before #7772, so nothing of it is read at the opening. The player sees no change; another state's laws still pass on its session's results.

**Time box.** 1 hour.

**Rules.** One rule, all 56 places: the check is `reachesTown` on the jurisdiction, never a named state. Two-level population: a legislator from elsewhere is filled in only when the player meets them or their detail is needed.

**Done when.** A second session runs `npx vitest run src/core2/wide-races.test.ts` in a drawn place, for example in a drawn place, Henlopen Acres, Delaware (seed pin-wr-0), and sees the national pool case pass with no outside legislator's term holding a person at the opening; and `src/bench/bills-at-opening.test.ts` still passes.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/wide-races.test.ts
