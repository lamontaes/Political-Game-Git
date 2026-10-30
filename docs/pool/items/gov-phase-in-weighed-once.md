---
id: gov-phase-in-weighed-once
title: "A member weighs a phased-in raise once, not once per dated step"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (review of gov-m3-01-phase-in-by-dated-steps)
---

**What.** positionOn (src/core2/modules/legislature.ts about 2741-2765) adds a member's views and their constituents' interest once per section of a bill, so a phase-in drafted as two dated steps on the same law counts every member's stance on that question twice. The doubled weight moves the member against the sponsor and changes the deal terms they ask for. The vote is not forced, but it is skewed, and nothing records the doubling.

**Rules.** No dice: a member's position is their views and their district's interest, once per question a bill changes, at the bill's full change (the last step's amount against the law in force). One engine: positionOn is the one reader; the fix is there, not in the drafting.

**Done when.** A test in a drawn place with the seed printed drafts the same raise once as one section and once as two dated steps ending at the same amount, and finds every member's position on the two bills equal, by member id and bill id, with the reasons naming the question once.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-phase-in-position.test.ts

**Notes.** TODO
