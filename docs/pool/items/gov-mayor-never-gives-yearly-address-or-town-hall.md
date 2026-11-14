---
id: gov-mayor-never-gives-yearly-address-or-town-hall
title: "A sitting mayor does only signing and cases for a year: no yearly address, town hall or office hours"
area: gov
lead: laws
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 14 (#9233 mayor check)"
checked:
---

**What.** In a played year a sitting mayor's recorded acts are only signing bills and, once, a case or a meeting with a department head. The yearly address (state of the city), the town hall, office hours, interviews, talking to a colleague about a bill, naming a department head, cutting a ribbon and the budget proposal are never taken, although the offer rules (`officeActProviders` in src/core2/office-day-acts.ts) hand them to any office holder every day (the address in its season, the town hall when none was given for `townHallIntervalDays`). Seen: the mayor's Journal over twenty weeks at a drawn place.

**Cause.** Found in code: src/core2/office-day-acts.ts and src/core2/modules/office-day.ts; a pinned played-world run (BenchPlayer selecting the sitting mayor, one year of weeks, stops left to the character) at Edmore, North Dakota (seed 08eb97a7875f8ad9e693196499fcf72f1a923d8ac426fd3559b09b196f7e8ff6) recorded `sign` x7 and `case` x1 as the character's own choice; at Matawan, New Jersey (seed 37b4c4822528f05ad88409f7c8ad724f88c8e4c6f6a28256b66c41d77eacc1f8) `sign` x3 and `meet-department-head` x1. The season for the address (January to `stateOfCityLastMonth`) was inside both runs. The character's own choice scores each offer, and rest outscored every office act (rest 1.1 to 1.4 against 0.6 for an act that is not due): the office acts carried no term for how long since they were last given, so rest won 133 of 141 free days at both places. The yearly address and town hall are also offered only in their season or interval.

**Fix.** Find why the character's own choice never picks the acts the offer rules allow, and let their traits, hours and the place's conditions choose them (no dice), so a mayor gives the address in its season and holds a town hall at its interval. Prove it in a one-year run at three drawn places with and without the change.

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; one engine per mechanic (the offices engine's acts, no second scheduler); an effect is a read, not a record.

**Done when.** A one-year played run of a sitting mayor at three drawn places (names and seeds in the PR) records the yearly address in its season and a town hall at its interval, each by record id, and the town's news or journal reads them. A second session plays a mayor in the running game, leaves the free days to the character, and sees office hours, meetings and an interview in the Journal across a season, with rest no longer every day.

**Built.** Each scheduled act now carries an `office-duty-due` reason (days since last given over its interval, from the acts table the offers already read), weighted by the TUNABLE `officeDutyDueWeight`; office hours now keep their own row so the interval counts. Over 20 weeks of a played mayor (rows in the acts table): Edmore ND office hours 9, meetings with eight different department heads 8, interviews 2, town hall 1, address 1; Matawan NJ 7, 8, 2, 1, 1; Odessa WA 9, 8, 2, 1, 1. Before: signing only (Odessa also one meeting). Not covered: other officials' town halls (cause-driven in meetings.ts) and the yearly address for world officials, which has no world path (see `gov-world-officials-never-give-yearly-address`).

**Waits on.** Nothing.

**Files.** src/core2/office-day-acts.ts, src/core2/modules/office-day.ts, src/core2/office-day-state.ts

**Notes.** Found by the #9233 mayor check (Nov 14). The same runs at a commissioner, a mayor, a U.S. Representative and a governor over two years through the browser showed no acts beyond a meeting with a department head; those runs left stops to the character too.
