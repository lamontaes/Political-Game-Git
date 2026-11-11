---
id: elections-past-race-votes-from-electorate
title: "A past race's printed vote count is the simulated electorate's, counted groups times their count, and names the real office and district"
area: elections
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/pool-elections-past-race-votes-from-electorate
pr: #7088
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:25 UTC
lead: governing
milestone: play-first
claimed-at: 2026-11-11T07:04:36.589Z
after:
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
checked: fable 2026-11-10
branch: claude/pool-elections-past-race-votes-from-electorate
merged-at: 2026-11-11T07:06:40.008Z
seen-by: "sonnet-8597 (Claude Sonnet 5.5, Claude Code cloud)"
seen-at: 2026-11-11T07:06:45.652Z
---

**What.** A past race's printed vote count was the count of full people, not the simulated electorate's, and the headline said "Legislator" instead of the office and district. Owner, Nov 1 playtest of v0.73.0, on the opening's front page: "All 54 votes were cast. No, I can tell that's the generated number of people, not the simulated amount of votes. You see all of these are race for legislator." Each state legislative race printed 52 to 55 votes. The fix merged in PR #7088 (governing/past-race-votes), and the Nov 1 Puerto Rico note says the totals are right. What is left is the second-session check this item never got.

**Cause.** Measured: owner playtest of v0.73.0, Nov 1, 22:25 UTC, New Game (the owner's run records no seed; the second-session check names the seed it draws), where legislative races printed 52 to 55 votes and "Legislator"); the fix merged in #7088, with no second-session replay recorded on main. The code is `src/core2/past-news.ts`, `src/core2/modules/voting.ts` and `src/bench/printed-words.ts`.

**Fix.** Replay the opening's front page in three drawn places on main and record the result with `npm run pool -- seen`; if a total is still the full-person count or the office reads "Legislator", reopen the item with what was seen.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One model, two tiers: a counted group votes with the same rule as a full person, times its count, so a district's total counts every counted voter. Estimate, never UNKNOWN: a turnout total starts from the real average with a per-world spread. No hand-written player text: the office and district name come from the seat's record through the English engine. Seen in game: only a second session's replay makes it done.

**Done when.** A second session replays the opening's front page in three drawn places (named with seeds) on main and sees every past state legislative race print a total that is the district's simulated electorate and turnout, not the full-person count, and name the office and district from the seat record. The published range is reported beside it as a figure to report, not a pass or fail. A test fails on a total equal to the full-person count.

**You will see.** Last November's legislative races show thousands of votes and name the seat and district, not "Legislator" with 54 votes.

**Screenshot.** The opening's front page race results from a drawn place.

**Waits on.** Nothing.

**Files.** src/core2/past-news.ts, src/core2/modules/voting.ts, src/bench/printed-words.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest (Nov 1, 22:25 UTC, five screenshots, New Game). Read: OWNER-DECISIONS (Oct 29 02:35 opening montage and address; Oct 29 address "no real statistic in play"; Oct 26 one scene system), the pool for twins.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 22:49 UTC) on branch claude/pool-elections-past-race-votes-from-electorate.

Released (2026-11-10): replay tests pass on three seeds; needs a running-game session for pool seen, no code change. Continue on branch claude/pool-elections-past-race-votes-from-electorate and pull request #7088.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 22:58 UTC) on branch claude/pool-elections-past-race-votes-from-electorate.

Released by next (2026-11-11): no push to claude/pool-elections-past-race-votes-from-electorate since 2026-11-10 22:56 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-elections-past-race-votes-from-electorate and pull request #7088.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:58 UTC) on branch claude/pool-elections-past-race-votes-from-electorate.

Released (2026-11-11): Replayed by test only (details on #7088): past-legislature-votes and past-race-district tests pass on 3 fresh draws each; not read on the front page in the browser; pool seen refuses non-merged items. Continue on branch claude/pool-elections-past-race-votes-from-electorate and pull request #7088.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:03 UTC) on branch claude/pool-elections-past-race-votes-from-electorate.

Released by next (2026-11-11): no push to claude/pool-elections-past-race-votes-from-electorate since 2026-11-10 22:56 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-elections-past-race-votes-from-electorate and pull request #7088.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 07:04 UTC) on branch claude/pool-elections-past-race-votes-from-electorate.

Seen in the game (2026-11-11, sonnet-8597 (Claude Sonnet 5.5, Claude Code cloud)): Plymouth NC 3753040 seed 3e0c945ed3c1; Suncrest WA 5368460 seed 4ceedcf44258; Millsboro DE 1047940 seed 798c884192d2, seed replay-a/b/c via drawPlace, main 65970ec3c31: Opening archive stories in three drawn places: every state legislative race prints a district-scale total (NC lower 1: 48,884, winner 29,072; NC upper 2: 115,562; WA lower 7: 39,315 and 40,941; WA upper 7: 83,081; DE lower 41: 5,854), never a full-person count, and names the office and district from the seat record (State Representative in District 1, State Senator in District 7). Plymouth NC county commission districts print only 89 to 94 votes (a local board race, outside this item); not checked further.
