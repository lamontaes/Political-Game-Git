---
id: campaign-real-race-played-proof
title: "The played-year proof of a real race: a group's volunteers, a forum, named donors and the incumbent coming home, by record id"
area: elections
kind: wiring
priority: 1
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: governing lead, Oct 30 (the played-year half of campaign-like-real-races)
lead: governing
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** campaign-like-real-races has two halves: path-check winning a council seat in 7 of 10 drawn places, and a buildBenchWorld played-year test showing an organization endorsing and sending volunteers, a forum the player hosts, money raised by named donors and the incumbent changing their schedule after the player gains, each by record id. This item is the second half, so its PR can merge on its own while the first is measured. The test is src/core2/campaign-real-race-played.test.ts, read on the eve of the election before any fold.

**Cause.** Design: owner ruling Oct 29, 2026 (docs/coordination/OWNER-DECISIONS.md, Oct 29 21:40 UTC) behind campaign-like-real-races. The test src/core2/campaign-real-race-played.test.ts (new on main; it exists on branch governing/real-race-played-proof at ede6bf1934) asserts the chain by record id.

**Fix.** Check out branch governing/real-race-played-proof, merge main into it, run its played test on two fresh seeds against the done-when, and open the PR, or write in the item what is left.

**Time box.** 3 hours for a Sonnet session.

**Rules.** The chain is the acceptance: every clause names its records by id from a drawn place with the seed printed. The incumbent clause requires the seat's incumbent when one is running; an open seat counts as missing and the test draws again. A person running in the same contest is never the evidence for a volunteer or a donor-meeting host.

**Done when.** A second session runs src/core2/campaign-real-race-played.test.ts in a drawn place with its seed printed and sees it pass, asserting by record id: a group endorsement whose member (not a candidate in the race) walked doors for the player; a forum the player hosted with its causes; a gift from a named donor and a donor meeting hosted by someone not running; and the seat's incumbent stepping up after reading the player ahead, with the campaign-stepped-up record kept. The clauses are read before election day.

**Waits on.** Nothing.

**Files.** src/core2/campaign-real-race-played.test.ts (new)

**Notes.** Nov 2, 01:40 (governing lead): branch governing/real-race-played-proof at ede6bf1934. Not re-checked since Nov 1. Next: run its played test on two fresh seeds against the done-when, then open the PR or write what is left here.
