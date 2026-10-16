---
id: play-politics-term-details
title: "The Politics sheet shows each term's service, start and end dates, how it was won, and the seat's past elections"
area: play
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: claude/play-politics-term-details
pr: #4651
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T08:12:24.420Z
---

**What.** `townSeats` carries `serviceStart`, `startDate`, `endDate` and `elected` for each term, and `pastElections(api, seatId)` lists the seat's elections, but `governmentView` sends only title, name, party and two dates, and nothing calls `pastElections`. Send the rest and render it.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** The Politics sheet in a drawn place shows a holder's years of service and how they were elected, with the election record id; a test in src/bench proves the view carries them.

**Files.** src/bench/government.ts, src/bench/play.mjs

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.
