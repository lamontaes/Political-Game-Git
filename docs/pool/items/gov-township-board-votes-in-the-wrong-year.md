---
id: gov-township-board-votes-in-the-wrong-year
title: "A township board elected all at once first votes in a year its state's law doesn't hold that election"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: "Account lead T19, Nov 13, 2026, from PR #9023"
checked:
claimed-at:
---

**What.** With PR #9023 a township board elected all at once puts every seat on one cycle, but the first cycle the game finds is often not the state's. Measured on branch claude/project-thread-h0yeu1 (world seed t19first): Adair, Illinois (1700178) first votes 2027-04-06 (real: April 2025, then 2029, 60 ILCS 1/50-40); Aberdeen, Indiana (1800140) 2025-11-04 (real: November 2026, IC 3-10-2-13); Advance, Michigan (2600480) 2025-11-04 (real: November 2028 with the presidential ballot, MCL 168.358); Abrams, Wisconsin (5500150) 2026-04-07 (real: April of odd years, Wis. Stat. § 60.30(1)(a)); Alfred, Maine (2300695) 2026-11-03 (real: each annual town meeting, one-year terms); Ada, Kansas (2000225) 2025-11-04 (real: November of even years). Connecticut (2025-11-04) and Rhode Island (2026-11-03) match. Seen: Politics, Elections and the clerk's filing date for the town board.

**Cause.** Found in code: a township office has no election calendar of its own; `electionInYear` and `staggeredSeatElection` (src/core2/elections-calendar.ts) read the state's municipal election calendar for `level: "township"`, and an all-at-once board takes the first cycle after game start (`termEnd` in src/core2/modules/offices.ts).

**Fix.** Add the township election's own cycle to each state row of data/research/local-government/township-governing-bodies.json (the month rule and the year parity or anchor year, from the statute already cited there) and have the calendar read it for township offices before the municipal one. No state named in code.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places. Research before building: quote each statute's cycle.

**Done when.** A second session starts new lives on main in drawn places of three township states and sees on Politics → Elections the town board's election on the date its state's law sets (the date and the statute named in the check), and a test over every township state's first board election matches its row.

**Waits on.** PR #9023.

**Files.** data/research/local-government/township-governing-bodies.json, src/core2/elections-calendar.ts

**Notes.** Filed by Account lead T19, Nov 13, 2026.
