---
id: gov-county-and-city-lines-share-one-employer-staffing
title: "A county's administration line change withdrew the opening a city's raise funded, so nobody was hired on the raise"
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
lead: laws
source: "Account lead F1, Nov 14, 2026, cause-finder on law-wiring-government at Ada County"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** A raise to a city's administration line funds an opening at the city government, and a county's own change to its administration line, landing before the opening's vacancy wait ended, withdrew it. A player who raises a town's administration line sees no one hired on it. Seen: the town's government jobs and the Journal's staffing lines after the raise.

**Cause.** Found in code: `STAFFING` for `budget-line:administration` names one employer, `cityGovernment`, and levels city and county (src/core2/data/laws/reach-group-a.json). `staffing` in src/core2/law-reach/group-a-staffing.ts kept one row per line and employer, so the county's change overwrote the city's row, and `baseStaffFor` rebased to the staff in place; the round for it then read the target as below the staff held plus the open opening and called `withdrawOpening`. Measured at Ada County, Idaho (1608830, world seed fa9893efaaf4cace3dacd5e911dce8d73ba7eb523261dbcb97e5c5c9853c9403) on train head 3076c6088caabe66f51a6bf94f3a409ee9b19c15: the raise on 2025-01-22 posted the opening on 2025-01-23 and the county's round withdrew it on 2025-03-05; no hire in 98 days.

**Fix.** Key the staffing row by government as well as employer, take another government's funded positions into the target and out of this line's base, and end a line's hire rows only when no government's raise stands. Pinned tests at Ada County and New Castle County, Delaware.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read (owner, Oct 13): the raise is read by the jobs engine as an opening and a hire, named by position id. Ask why: the hire cites the line's law row.

**Done when.** A second session, not the builder, replays the pinned case at Ada County and in a drawn place nobody chose on main, raises the city's administration line and sees a hire recorded on it within 98 days, with the opening still open until it is filled, and the test file's two pinned cases pass.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-a-staffing.ts, src/core2/law-wiring-government.test.ts, src/core2/budget-line-staffing.test.ts, src/core2/budget-line-schools-staffing.test.ts, src/core2/budget-line-staffing-year.test.ts
