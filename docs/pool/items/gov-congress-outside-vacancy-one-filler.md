---
id: gov-congress-outside-vacancy-one-filler
title: "A member of Congress outside the town who dies is replaced through the offices engine's vacancy law, not seated again by the legislature when it next sits"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/congress-vacancy-one-filler
pr: #6706
blocked-on: gov-sampled-legislator-seats-never-refilled
lead: wire-office
source: wire-office session, Oct 28 (found while fixing the sampled seats)
claimed-at: 2026-10-28T21:23:22.534Z
---

**What.** The officials engine seats every member of Congress outside the town's state with no term in the offices engine. When one dies, `congressMembers` in src/core2/modules/legislature.ts seats a new member the next time the chamber sits (`seatOfficial` keyed by the day), with no vacancy, no rule and no special election. A House seat is filled only by a special election in law, so the House counts a member it would not have. That is a second filler beside the offices engine's vacancy engine, which #6701 opens to seats it keeps no term for.

**Rules.** One engine per mechanic: the death opens a vacancy in the offices engine under the federal office's own rule row (a House special election, a Senate appointment then special election by state law), and the legislature reads who sits, never seats a dead member's replacement itself. Replace, never layer: the legislature's own death refill goes. No dice: the filler comes from the rule and the engines already casting officials.

**Done when.** In a buildBenchWorld drawn place (place and seed named), a test plays a year and follows a member of Congress outside the town who dies to the vacancy record, shows a House seat awaiting its special election is not among the chamber's members until it is filled, and names the member who fills the seat, by record id; npm run all-places -- --years 2 --seed 5a7c867eec0d34f1 --only US-ID,US-VA still shows Seats pass.

**Time box.** 3 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Files.** src/core2/modules/officials.ts, src/core2/modules/offices.ts, src/core2/modules/legislature.ts, src/core2/officials-sample-vacancy.test.ts

**Notes.** Stacked on #6701 (gov-sampled-legislator-seats-never-refilled), which adds the vacancy path for seats the offices engine keeps no term for.
