---
id: play-campaign-event-venue-unaffordable
title: "A local candidate's campaign cannot raise the price of an event venue: at most 96 dollars against 300 across six drawn towns"
area: play
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A candidate who holds no seat and files for a town or county seat takes the campaign day's calls and doors until a day raises nothing, and still cannot hold an event: the venue costs 30000 cents and the best campaign held 9600 after its calls ran dry (seed abc123, six places drawn with drawPlace; the others held 1200 to 1900). Donors are each asked once, so the money stops. Find whether the donors' gifts, the candidate's own backing of their campaign, or the venue's price is out of line with real local campaigns, and fix the term that is.

**Rules.** No dice: the money comes from donors' and the candidate's own reasons, never a roll. Research before building: real local campaign receipts and venue costs check the totals. One model, two tiers: counted donors give by the same rule times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld, places drawn from all 56 with seeds named) a candidate who holds no seat holds an event from the campaign day without any test fixture paying them, and src/bench/campaign-day-controls.test.ts asserts the event unconditionally with its cause ids.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json, src/bench/campaign-day-controls.test.ts

**Notes.** Found finishing play-campaign-interview-and-event-without-seat (PR #5710). A test rewrite that asserts the event unconditionally is in that session's scratchpad; it failed in every place for lack of funds.
