---
id: gov-unopened-outside-holders-never-leave-office
title: "Another state's legislators and governor who were never built never die, fall ill or move, so their seats never fall vacant mid-term"
area: gov
kind: bug
priority: 3
size: M
status: claimed
claimed-by: claude/fixer-unopened-holders-leave-office
pr:
blocked-on:
standard: 2
model: opus
effort: medium
lead: governing
root: design-one-model-two-tiers
source: Fixer A, Nov 18, tracing the one outside law that #10124 changed at St. Paul, Iowa (place 1970185, seed a0f115d656f8970a)
claimed-at:
after:
checked:
---

**What.** Since #10124, another state's legislators and governor who nobody has opened are names on their terms and nothing else, as the CTO ruled on Nov 18 (13:44Z, #9747). The health engine runs illness and death only for people and husks (`src/core2/modules/health.ts`, the `deathsByDate` loop: "A husk whose death falls due is built now, then dies as anyone does"). An unopened holder is neither, so they never fall ill, die or move, and `vacateSeat` (`src/core2/modules/offices.ts`, the `life.death` and moved-away handler) never opens a vacancy for their seat. On the train head before #10124, the session built them as husks. At St. Paul, a Puerto Rico at-large representative (`term:seat:US-PR:lower:At-Large:4:2025-01-20`) died on 2025-04-23, and an appointee took the seat (`term:seat:US-PR:lower:At-Large:4:2025-04-23`). That one new member out of 81 raised the agenda's new-members share, which carried a bill restricting abortion onto the August session, and it passed 38-15 and 17-11. With #10124 there is no death, no appointee and no law. Seen: another state's laws in force on the state and nation screens, and the special elections and appointments listed for its seats.

**Cause.** Measured: St. Paul, Iowa (1970185), seed a0f115d656f8970a, one year on the train head 53a87311 against #10124 (head a6486ab5). The agenda row `agenda:US-PR` has the same figures on 2025-08-18 in both trees. Its member list differs by that one seat, and the pull for the question is 1.022 against 0.9975 (`sessionAgenda` in `src/core2/modules/world-legislating.ts`, `newMembers`). The agenda reads what it should. The difference is that the old code built the member, so the health engine ran their life.

**Fix.** The CTO's call between two ways. (a) The health engine reads an unopened outside holder from their term's identity (birth date and home state), as it reads a husk, keyed `official:<term>`. When a death falls due, it builds the holder as it already builds a husk, and they die through the one death path, so `vacateSeat` runs. (b) Departures for unopened holders are kept as results: the one mortality rule, read for each holder's age from their term's identity, without building anyone. Whichever is chosen, no seeded pick decides who leaves.

**Time box.** 3 hours.

**Rules.** Two-level population: nobody is built until the player meets or opens them, except as the one death path already builds a husk. One engine per mechanic: the health engine and the offices vacancy engine, never a second mortality or vacancy writer. No dice. One rule, all 56 places.

**Done when.** A second session, in a played world at a drawn place and seed nobody chose, plays a year and sees at least one other state's seat end mid-term by a death or a move, with its vacancy and filler listed by record id, and offices-every-legislature.test.ts still passes.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, src/core2/modules/offices.ts, src/core2/modules/officials.ts, src/core2/modules/world-legislating.ts

**Notes.** CTO, Nov 18 15:04Z on #9747 (6982417672): "(b), in your pool item, not in #10124. Other places keep only their results. A holder nobody has opened leaves office under the same mortality and move rules everyone else follows. The result is what gets written: the term ends, the seat falls vacant, and an appointee or special election follows by the place's own law. Nobody is built for it. If the player later meets that person, the draw already reflects that they left." Built on branch claude/fixer-unopened-holders-leave-office by Fixer A.
