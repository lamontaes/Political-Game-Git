---
id: gov-floor-date-named-then-vote-a-week-later
title: "A bill's paper names the floor week and the vote then falls a week later"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: the Account lead's note on #9474 (Nov 15): a date the game names and then misses by a week
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** A state bill's paper says "The floor takes it up on" a date, and the floor does take it up that day, but the vote is booked for the next sitting a week on, so the player who waits for that date sees the vote a week later. In a Florida place (key 1200075, seed aa11), a sales-tax bill drafted January 20 before the March 4 sitting was named for March 25, was booked that day and was voted and enacted on April 1. Seen: on the bill paper's "Where it is" line, which changes from March 25 to April 1 on March 25, and on the stage view's vote day.

**Cause.** Found in code: `scheduleVote` in `src/core2/modules/legislature.ts` books the vote on the body's next sitting and, where the public-notice law in force needs hours of notice, on the sitting after that; `floorWeeks` in `src/core2/modules/world-legislating.ts` calls it only when the floor week arrives, so the posting day is the floor week and the vote waits a week for notice. `floorDateOf` names the floor week, not the vote's day.

**Fix.** Name the day of the vote, not the week the floor takes the bill up: the leader posts a bill on the day it is calendared (`projectedFloorDate`, `calendarWaitingBills`), so the notice has run by its week and `scheduleVote` lands the vote on the week named; a bill calendared too late for notice is named for the sitting after, as `scheduleVote` already does. No second scheduler; `floorWeeks` stays the one. Recommended: the date the paper names is the day, because the player's clock stops on that day and a week's slack is a date the game missed.

**Time box.** 3 hours for one opus session.

**Rules.** No dice. One engine for every chamber and place; pinned places and fixed seeds in the test.

**Done when.** A second session, at a place and seed it did not choose, drafts a state bill before a sitting, reads the date the paper names, plays the days with other filings between, and sees the vote held on that day, with the drawn place, seed and bill record id written down.

**Waits on.** gov-floor-date-kept-leaves-two-gaps (#9474), whose test allows the vote up to a week after the date named.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/bill-floor-date-gaps.test.ts (new)

**Notes.** Measured while building #9474: Florida 1200075, seed aa11, floorOn 2025-03-25 kept from the sitting's opening on March 4, the vote booked March 25, enacted April 1; `npx vitest run src/core2/bill-floor-date-gaps.test.ts` plays it.
