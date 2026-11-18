---
id: people-town-clerk-job-given-to-a-council-member
title: 'A council member or mayor also holds the town''s "city clerk" or "city planner" job, and the town has a second clerk'
area: people
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Words lead, Nov 14, cards in Naples SD and Donaldsonville LA
lead: words
standard: 2
model: opus
effort: medium
root: design-words-machine
after:
---

**What.** In Naples, South Dakota (seed 9108-counter-a), person_e2016f075c452f2d sits on the council (term from 2024-05-02) and also holds the stored job "City clerk" (work-relationship_e6cf440a7126c0bd); person_44ff768dec0173df is mayor (term from 2023-05-04) and also holds "City planner" (work-relationship_7ce8dd6653d68af3). The town has a separate clerk, person_6e502283b204cc51 ("City Clerk", job:public:town:city-clerk:person_6e502283b204cc51), so it has two clerks. Donaldsonville, Louisiana (seed 9108-counter-b) has the same two-clerk shape (person_96a09533e95af6bc and person_39d13c9cd085bc3d), with no office held by either. Seen: the person card's work line and the Journal's clerk lines name two clerks of one town.

**Cause.** Found in code: `CIVIC_MINIMUM` in `src/core2/opening-town-jobs.ts` (lines 108 to 111) seats one "City clerk" and one "City planner" per town from the drawn people, whoever they are, and the payroll's own city-clerk job (`job:public:town:city-clerk:<person>`) is made separately, so a town gets two clerks and the minimum roles can land on a person who sits on the council. Offices are filled by a different engine that does not know the staffing choice.

**Fix.** The civic minimum reads the payroll's clerk and planner (if the town has them) and takes that person, instead of drawing another; it never picks a person who holds an office on the body the job reports to.

**Time box.** 2 hours, Opus medium.

**Rules.** One rule for all 56 places; replace, never layer; no dice.

**Done when.** In three drawn places on a fresh seed, each town has exactly one clerk job and no one holds both a council or mayor seat and the clerk job; a test fails on two clerks in one town. A second session, on main, opens the clerk's card and sees one clerk.

**Waits on.** Nothing.

**Files.** src/core2/opening-town-jobs.ts, src/core2/town-workplaces.ts

**Notes.** Filed by S4, Nov 14. The card is right to say the office and drop the job: an office is the thing a player reads first. The stored job rows are the fault.
