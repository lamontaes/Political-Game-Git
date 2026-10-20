---
id: office-stopgap-office-day-federal-president-missing-record
title: "Stopgaps in office-day-federal-president (missing-record): 2 open"
area: office
kind: stopgap
priority: 2
status: open
claimed-by:
pr: #5124
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-federal-president.ts, kind missing-record"
claimed-at:
---

**What.** Two missing-record stopgaps remain in the president's day. SG-OFFICE-FED-trip-residents: the people a traveling president meets in another town are recorded identities of that place with no household, job or records beyond the meeting. SG-OFFICE-FED-situation-room: the situation room never opens because main keeps no crisis record. Fill in a met person from the other place's coarser counts as the player's town does, and open the situation room on the crisis records once disasters land. The player would notice meeting a real resident of another town, with a job and family, and a briefing when a crisis happens.

**Rules.** One model, two tiers: a person met in another place is filled in from that place's counted population by the same rule, matching what the records already say about their job and pay; An effect is a read, not a record: the situation room reads crisis records at the moment the day opens; No dice: who is met and what is briefed follow the records, not a roll; One rule, all 56 places: no place named; other places are kept coarser; Placeholders: each row closes only when the real record exists; Speed: filling in happens when the player meets the person.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): on a presidential trip the person met has a household, job and pay consistent with the other town's counts (person and place record ids), and with a recorded disaster the situation room lists it with the department that answers it. Both rows close in `stopgaps.json`. Tests beside `src/core2/office-day-federal.test.ts`. The owner plays it: visits a town as president and talks to a resident who has a job and a family.

**Files.** src/core2/office-day-federal-president.ts, src/core2/modules/residents.ts, src/core2/data/stopgaps.json

**Notes.** First row: The people a traveler meets in a town other than the player's are recorded identities of that place (drawn from the world's seed and the town), with no household, job or other records there beyond the meeting.
