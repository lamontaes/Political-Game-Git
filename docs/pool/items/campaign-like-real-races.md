---
id: campaign-like-real-races
title: "Winning a race the way real campaigns win: groups, money, forums, debates, meeting voters and momentum"
area: elections
lead: governing
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
after:
blocked-on: campaign-real-race-played-proof, campaign-incumbent-hears-the-race, campaign-donor-reasons-refit, campaign-like-real-races-part-1-path-check-wins
source: owner, Oct 29 voice note on the governing brief
claimed-at:
standard: 2
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** No life started from New Game has ever won a race (governing brief, Oct 29). The owner, Oct 29: "look at real races... she was working with the Democratic Socialists of America. And, you know, then her campaign gained steam, and then it caused [the incumbent] to try to go back to New York to campaign... some people... just do donor meetings... you need to be able to... host a forum... meet your possible constituents... debate" and "it's not just door knocking, it's raising money and stuff like that that needs to be decided for A." A door yes is near-binding (Oct 29). This is phase A of the governing plan: the campaign actions a real underdog uses, each moving real voters through the campaigns engine, and an incumbent who reacts when a challenger gains. Seen: a New Game life winning a race the way real campaigns do: groups, money, forums, debates (owner, Oct 29).

**Cause.** Design: owner ruling Oct 29, 2026 (docs/coordination/OWNER-DECISIONS.md, Oct 29 21:40 UTC, from the owner's voice note on the governing brief): campaigns work like real races, with groups, money, forums, debates and an incumbent who reacts, and no life started from New Game has won a race. The campaigns engine is src/core2/modules/campaigns.ts.

**Fix.** Wire the campaign actions an underdog uses through the one campaigns engine, with no second system. The work is four parts: the played-year proof, the incumbent who reacts, money from named donors, and the path-check measurement of wins. Close this item when the parts have merged and a second session has seen the finish line.

**Time box.** 2 hours for one Sonnet session, the closing check. When it runs out, write what was seen in the item and stop.

**Rules.** Look before you ask: the campaigns engine already has call donors, doors, ads and debates; wire through it, never a second campaign system. No dice: support, money and momentum come from people's reasons and records. This is a game, not a spreadsheet: each action is a stop or a scene, never paperwork.

**Done when.** A second session, in the drawn places named by the path-check run with their seeds, starts from New Game and sees the path check win a council seat in at least 7 of 10 drawn places. In a buildBenchWorld played year the session sees an organization endorse and send volunteers, a forum the player hosts, money raised by named donors, and the incumbent changing their schedule after the player gains, each by record id.

**Waits on.** Its parts: campaign-real-race-played-proof, campaign-incumbent-hears-the-race, campaign-donor-reasons-refit and campaign-like-real-races-part-1-path-check-wins.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/bench/campaign.ts, src/bench/path-check.ts

**Notes.** Filed by the CTO, Oct 29, from the owner's voice note on the governing brief (OWNER-DECISIONS, Oct 29 21:40 UTC). Read: OWNER-DECISIONS, DECISION-REGISTER, the governing brief's four research notes; searched the pool for twins.

Nov 2, 01:40 (governing lead): the played-year test is on governing/real-race-played-test at 6ec2b016c2, 14 commits ahead of main; the claimed branch governing/campaign-like-real-races has nothing of its own. Next: merge main into governing/real-race-played-test, run its test on two fresh seeds, and open the PR from it.
