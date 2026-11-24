---
id: core2-world-starting-mid-session-has-no-bills-in-motion
title: "A world that starts mid-session opens with no bills filed, in committee or on the floor"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: medium
root: none
source: filed by hand by the meetings and floor builder, Nov 14 2026, on the owner's ruling "it's all one simulation" (Nov 14 19:27Z)
checked: meetings and floor builder 2026-11-14
---

**What.** A world built with a start date after the opening of a legislative session has no session bills at all: none filed, none in committee, none waiting on the floor. The owner's ruling (Nov 14: "not just town, but country and state. Remember, it's all one simulation") says the legislature, state and federal, is in motion on day one, so a world that starts in March must open with the session's bills already filed, in committee and on the floor, as a world that had run since January would hold them. Seen: the member of a state house at a drawn place, started in March, hears no floor debate.

**Cause.** Measured: at Columbus, Indiana (seed meet-s:0), a world built with buildBenchWorld(seed, March 16 2025) and a member played 14 days heard no floor debate and the floor-debate-ahead test failed ("a reply pressed on the floor" false), while the same place built on January 20 and run on to March 16 heard its first debate on March 24. The session's bills come from the world running through its calendar; nothing seeds them for a later start. Found in code: src/core2/modules/world-legislating.ts floorWeeks and its session setup read the bills introduced since the session opened, and a world that starts later has no such history.

**Fix.** At world creation with a start date inside a session, seed the legislature's session as the run so far would have left it (bills filed by the people who file, the committees' work, the floor queue), through the same legislating engine, state and federal bodies alike. One engine; no per-level path.

**Time box.** 16 hours.

**Rules.** One engine per mechanic; no new stopgaps; no dice (the bills come from the people, their views and the world's conditions); every place of the 56; names place and seed.

**Done when.** A second session builds the world at Columbus, Indiana (meet-s:0) with a start date of March 16, 2025, plays 14 days as a state representative, and hears the March 24 floor debate; and the same at a state senate seat and a federal seat at drawn places. Names place and seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/bench/world.ts

**Notes.** Seen: floor-debate-ahead test at meet-s:0 with a March 16 start, Nov 14 2026 (the test now runs the world on from January instead).
