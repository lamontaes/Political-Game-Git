---
id: elections-past-race-votes-from-electorate
title: "A past race's printed vote count is the simulated electorate's, counted groups times their count, and names the real office and district"
area: elections
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:25 UTC
lead: governing
milestone: play-first
---

**What.** Owner, Nov 1 playtest of v0.73.0, on the opening's front page: "All 54 votes were cast. No, I can tell that's the generated number of people, not the simulated amount of votes. You see all of these are race for legislator." Each state legislative race printed 52 to 55 votes cast, which is the count of full people the world holds, not the district's voters (counted groups times their count). Every headline also says "the race for Legislator" instead of the office and district. The opening's past races must total the district's simulated votes, and their story must name the office as the place's records do.

**Rules.** One model, two tiers: a counted group votes with the same rule as a full person, times its count, so a district's total counts every counted voter. Estimate, never UNKNOWN: a turnout total starts from the real average with a per-world spread. No hand-written player text: the office and district name come from the seat's record through the English engine.

**Done when.** In three drawn places (named with seeds), every past state legislative race on the opening's paper prints a total within the district's simulated electorate and turnout (shown beside the published range in the PR), and names the office and district from the seat record; a test fails on a total equal to the full-person count.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Last November's legislative races show thousands of votes and name the seat and district, not "Legislator" with 54 votes.

**Screenshot.** The opening's front page race results before and after, from a drawn place.

**Files.** src/core2/past-news.ts, src/core2/modules/voting.ts, src/bench/printed-words.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest (Nov 1, 22:25 UTC, five screenshots, New Game). Read: OWNER-DECISIONS (Oct 29 02:35 opening montage and address; Oct 29 address "no real statistic in play"; Oct 26 one scene system), the pool for twins.
