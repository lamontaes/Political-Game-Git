---
id: meetings-board-comment-record-counts-late-remarks
title: "A board's public-comment record counts the remarks made at its own meeting, not only its committee's"
area: gov
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: meetings-resident-remark-reaches-a-committee-board
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: left by meetings-resident-remark-reaches-a-committee-board (Account lead T41, Nov 13), as the Account lead asked; filed by hand on the branch
---

**What.** At a board with committees, the bill's public-comment record (`public-comment:<bill>`) is kept on the committee's day with the residents who spoke there. A resident who then speaks at the board's own meeting is heard by the members and cited by that record, but its for and against counts still show only the committee's day. Found in Jaguas, Puerto Rico (key 7237336, place seed 9d9e53d2305f75c3583e29af76860e2d96c0bd7bb16d04e5b1b33e87c455f942): Ordinance 2025-3's record counts the six residents of 2025-02-03 and not the player's remark of 2025-02-04. Seen: the bill's hearing line (the `public-comment` builder in src/bench/printed-words.ts) and the press topic read in src/core2/press-topics.ts, which read the counts.

**Cause.** Found in code: an event id enters once (`applyCoreEvent` in src/core2/state.ts returns on a known id), and `hearRemarks` in src/core2/modules/meetings.ts emits `public-comment:<bill>` for both the committee's day and a later remark, so the later emit is dropped with its counts.

**Fix.** Keep the board meeting's comment as its own record, dated by the meeting (one event per sitting where anyone spoke), and have the members' ties cite the sitting's record. This prints a second hearing line for the bill, a player-visible change: the lines go to the Words lead before building, and the Story session writes any new piece.

**Time box.** 2 hours

**Rules.** One engine per mechanic: the record is kept by `hearRemarks` only. No new words without the Words lead.

**Done when.** A second session sees it in the running game: in a drawn place whose board has committees, a resident speaks at the board's meeting, and the bill's record shows the committee's comment and the board's comment each with its own counts.

**Waits on.** meetings-resident-remark-reaches-a-committee-board; the Words lead for the line.

**Files.** src/core2/modules/meetings.ts, src/bench/printed-words.ts
