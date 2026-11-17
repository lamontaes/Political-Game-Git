---
id: core-speed-organize-rebuilds-chamber-every-read
title: "Leadership rebuilds a chamber's whole member list on every committee or leader look-up"
area: core
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/speed-leader-of
pr: 9824
after: speed-leadership-organizing-rates-each-pair-once
blocked-on:
lead: speed
model: opus
effort: medium
root: rc5-full-detail-every-day
source: Blockers on the crew line (#9747, Nov 17, 01:22Z); measured by Speed
---

**What.** Every time the game asks who chairs a committee, who sits on one or who leads a chamber, leadership rebuilds the chamber's whole member list only to confirm that nothing changed. In a state with a 400-seat House that runs tens of thousands of times a month and takes most of a played day. Seen: a played month at Epping, New Hampshire takes 14 to 15 seconds instead of about 6.

**Cause.** Measured: at Epping, New Hampshire (key 3324580, seed 81a2cdbf-b3a8-47b3-ae55-21a233d68a37), by a temporary counter in `organize` (src/core2/modules/leadership.ts) on main c5808caa, the bench build made 25,858 calls with 7 reorganizations, and 30 played days made 66,461 calls, about 10 s inside them, with 0 reorganizations. Found in code: `committeesOf` (src/core2/office-day-state.ts) asks `committeeRoster` for every committee of each member it reads; each roster calls `organize`, which calls `members` (src/core2/modules/legislature.ts) and `holderOf` on every term and sorts a signature, every time.

**Fix.** `organize` keeps each chamber's last member signature in a `WeakMap` keyed by the world, stamped with the date and the write counts of the three engines `members` reads (offices, officials, voting). While the stamp holds, the kept signature stands for the list; any write to those engines, or a new day, rebuilds it once. The `organized` row and the posts are still read live. Under bookkeeping (tests) the list is always rebuilt and checked against the kept signature. The player sees a played week in a large-chamber state run in less than half the time.

**Time box.** 3 hours.

**Rules.** Speed: act on the day something changed, never rebuild the same list on every read. No dice: the records proof shows the same records before and after, by table digest.

**Done when.** At three drawn places, among them Epping, New Hampshire (seed 81a2cdbf-b3a8-47b3-ae55-21a233d68a37), `speed:year --years 1 --proof-out` gives 0 differing tables between main and the branch, and the bench build plus 30 played days at Epping is timed before and after, alternating. A second session plays a week at a drawn place in New Hampshire on main and sees it take a few seconds, not ten or more.

**Waits on.** Nothing.

**Files.** src/core2/modules/leadership.ts

**Notes.** Filed by Speed, Nov 17. Laws and effects owns `members`; it is not changed. The cause and the plan were posted on #9747 at 01:55Z before the push.
