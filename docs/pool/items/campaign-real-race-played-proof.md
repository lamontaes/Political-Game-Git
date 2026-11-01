---
id: campaign-real-race-played-proof
title: "The played-year proof of a real race: a group's volunteers, a forum, named donors and the incumbent coming home, by record id"
area: elections
kind: wiring
priority: 1
size: S
status: claimed
claimed-by: governing/real-race-played-proof
pr:
blocked-on:
source: governing lead, Oct 30 (the played-year half of campaign-like-real-races)
lead: governing
claimed-at: 2026-10-30T09:16:22.511Z
---

**What.** campaign-like-real-races has two halves: path-check winning a council seat in 7 of 10 drawn places, and a buildBenchWorld played-year test showing an organization endorsing and sending volunteers, a forum the player hosts, money raised by named donors and the incumbent changing their schedule after the player gains, each by record id. This item is the second half, so its PR can merge on its own while the first is measured. The test is src/core2/campaign-real-race-played.test.ts, read on the eve of the election before any fold.

**Rules.** The chain is the acceptance: every clause names its records by id from a drawn place with the seed printed. The incumbent clause requires the seat's incumbent when one is running; an open seat counts as missing and the test draws again. A person running in the same contest is never the evidence for a volunteer or a donor-meeting host.

**Done when.** src/core2/campaign-real-race-played.test.ts passes in a drawn place with its seed printed, asserting by record id: a group endorsement whose member, not a candidate in the race, walked doors for the player; a forum the player hosted with causes; a gift from a named donor and a donor meeting hosted by someone not running; and the seat's incumbent stepping up after reading the player ahead, with the campaign-stepped-up record kept; and the clauses are read before election day.

**Files.** src/core2/campaign-real-race-played.test.ts

**Notes.** TODO
