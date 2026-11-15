---
id: legislature-senators-keep-no-company-in-session
title: "Most state senators spend no free time with anyone during a session"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: legislature-session-evenings-have-no-gatherings
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, measuring people-free-company-goes-to-one-tie on rooms and attendance (the Account lead asked for it as its own item)
---

**What.** At 4846968 (Texas) seed 8647-mason, with the state senate filled in and the player at seat 016, 28 of the 31 senators made no `contact-known-person` act with anyone from Feb 1 to Mar 31, 2025, during the session. The three who did (016, 022 and 024) made 22 between them, all with each other. A legislator in session still has evenings, and spends them with somebody: colleagues, the people they lodge near in the capital, the family they call. Seen: a senator's Journal and person card show no evenings with anyone for two months of session, and colleagues never grow closer outside the floor.

**Cause.** Measured: the script company/measure.mts on the lying thread's head ee4c3740 (the rooms and attendance PR #9557), at 4846968 seed 8647-mason. Why they choose no company at all is not yet traced. The likely place is the time a session day leaves (the floor day and the rest of a session day at the Capitol, src/core2/modules/legislature.ts `sittingContactHours`, against the free hours the people engine offers for company), but it has not been read.

**Fix.** First trace one senator's day (free hours, the acts offered, the pick) on a sitting day and a weekend. If the session day leaves no free hours, the evening is where the colleagues meet: legislature-session-evenings-have-no-gatherings answers it, and this item is closed with the trace. If free hours remain and company is still never chosen, fix that read in src/core2/modules/people.ts.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice, no cap. Wire to the world: proven in a played session with record ids.

**Done when.** At the named place 4846968, a pinned test with seed 8647-mason (about a minute, seen red on today's code) shows most senators keeping some company during the 2025 session, with the people named. A second session sees in dev mode on main a sitting senator's Journal with evenings spent with someone.

**Waits on.** legislature-session-evenings-have-no-gatherings, which may answer it.

**Files.** src/core2/modules/people.ts, src/core2/modules/legislature.ts
