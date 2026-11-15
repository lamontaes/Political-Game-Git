---
id: gov-long-session-floor-pace-rounds-to-nothing
title: "A year-long legislature takes no bill to the floor until late summer, so a played legislator has no floor vote for most of the year"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/cluster11-long-session-floor-pace
pr: #9535
blocked-on:
source: "the lying thread's trace of why a played legislator never gets a vote to work for (Nov 15), relayed by the coordinator"
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** In a legislature that sits all year, the floor takes up no bill until about the middle of August, so a player seated there has no floor vote to work for and the paper has no floor news for most of the year. It affects every legislature that sits more than a few months and has fewer bills than weeks. Seen: the bill paper of any bill at an Ohio or New York or Virgin Islands place names a floor date in December, and the player's floor-vote stop does not come until late summer.

**Cause.** Measured: at Cuyahoga Heights, Ohio (3919806), seed aa11, and at Red Hook, U.S. Virgin Islands (territory:VI:red-hook), by `npx vitest run src/core2/long-session-floor-pace.test.ts` on the Train before the fix: Ohio sits Jan 6 to Dec 31 with 9 filings and its first floor week is Feb 10; `floorWeeks` in src/core2/modules/world-legislating.ts took `round(waiting / weeks left)` bills a week, which is 0 until about 18 weeks remain, and the paper named Dec 22 for the first bill; Red Hook has 6 filings over the same weeks and the same date. A short session is not touched, because its weeks are few.

**Fix.** Read what the floor owes from the bills already decided: by the end of floor week k of N the floor has taken up `ceil(total × k / N)` bills, where total is the decided bills plus those waiting or yet to be filed; a week takes what is still owed, capped at the session's floor days, and only bills committee has had, so the share waits in a week when none is ready. The vote, the floor date and the agenda all read the one function, so they agree. A share under one bill a week is not rounded away and nothing is kept in memory. This is the cause of the long-session half of gov-floor-agenda-three-votes-a-year; the other half, how many bills a legislature has in a year, stays with that item.

**Time box.** 3 hours for one opus session.

**Rules.** No dice. One engine for every chamber and place; pinned places and fixed seeds in the test. Speed: a year with more floor votes costs more; its cost is measured at three places.

**Done when.** A second session, at a place and seed it did not choose with a year-long legislature, sees the first floor vote held in the first floor week and the rest spread through the year, the date its paper names for each bill, the agenda the evening ask reads and the day the vote is held agreeing; the place, seed and bill record ids are written down.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/long-session-floor-pace.test.ts (new)

**Notes.** After the fix the floor takes up its first bill in the first floor week and one about every five weeks after, with the last week taking the rest.
