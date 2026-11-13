---
id: meetings-resident-remark-reaches-a-committee-board
title: "A resident who speaks at a board with committees is heard by its members, who then know them"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: Account lead T41
pr: claude/project-thread-1d9gdt
after: gov-held-meeting-decides-as-unheld
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: found by a fresh draw while carving gov-held-meeting-decides-as-unheld (Account lead T22, Nov 13); filed by hand on the branch
---

**What.** A resident who holds no seat and speaks at a meeting of a board that has committees is not heard by its members: after the vote none of the members knows them. Found in Jaguas, Puerto Rico (key 7237336, place seed 9d9e53d2305f75c3583e29af76860e2d96c0bd7bb16d04e5b1b33e87c455f942): the resident spoke for Ordinance 2025-3 at the board's meeting and the bill was voted at the close, but the member person_06cdddae23b14ea4 does not know the player. Seen: People the morning after, where the board's members should be listed, and the remark on the bill's record.

**Cause.** Found in code: a board larger than `committeeOfTheWholeMaximum` runs the committee-stage hooks on the day the filings go on the agenda (`holdCommittee` in src/core2/modules/legislature.ts calls `runBeforeVote(api, billId, "committee")`), and `public-comment` is one of them (hooksRun on the bill lists it). The remark is taken at the meeting, a day later, after the hook has already run and been marked done (reproduced in Jaguas), so `publicComment` in src/core2/modules/meetings.ts, which makes the members meet each speaker on the record, never sees it. The same bill's hooks run on the meeting day for a body with no committee, where the resident's remark lands in time.

**Fix.** Let a remark made after the hook has run reach the members the same way: when a resident speaks (`speakOnItem` in src/core2/modules/office-day.ts), if the bill's public-comment hook has already run, run the part that makes the members meet the speakers for that remark once, by the one function `publicComment` calls (no second path for meeting people). Keep the test's pass-over in src/core2/office-day-attend.test.ts ("a resident marks a posted meeting…") only for bills where the hook has not yet run, and add Jaguas as a kept place that must pass.

**Time box.** 2 hours

**Rules.** One engine per mechanic: the members meet speakers through `meetAtMeeting` only. No dice. Wire to the world: prove it in the kept place and one drawn place.

**Done when.** A second session sees it in the running game: in a drawn place whose board has committees, a resident speaks at its meeting, and the next morning the board's members are listed on People and each member's tie cites the public comment record by id.

**Waits on.** gov-held-meeting-decides-as-unheld

**Files.** src/core2/modules/office-day.ts, src/core2/modules/meetings.ts, src/core2/office-day-attend.test.ts
