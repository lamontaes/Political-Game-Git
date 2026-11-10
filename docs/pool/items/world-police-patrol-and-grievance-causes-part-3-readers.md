---
id: world-police-patrol-and-grievance-causes-part-3-readers
title: "The incident producer can read patrol hours, the crime rows and a grievance through one read"
area: world
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: world-police-patrol-and-grievance-causes-part-1-patrol-hours, world-police-patrol-and-grievance-causes-part-2-grievance-record
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: design-movements-and-unrest
source: split from world-police-patrol-and-grievance-causes in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Once patrol hours and grievances exist, gov-justice-incident-producer needs one place to read them with the existing crime rows. Add the read functions (the patrol hours of a place and month, the grievances of a person, the crime place-month row) as one small module the producer imports, and prove in a played year that all three return records with ids. This is the third of three parts of world-police-patrol-and-grievance-causes; the producer itself stays in gov-justice-incident-producer.

**Cause.** Design: docs/design/proposals/movements-and-unrest-2026-10-14.md. gov-justice-incident-producer (docs/pool/items/gov-justice-incident-producer.md) asks for incidents from patrol hours, crime outcomes and grievances, and src/core2/modules/crime.ts keeps only the crime rows.

**Fix.** Add one module exporting the three reads over the patrol-hours rows, the grievance rows and the crime place-month rows, with a test that calls each in a played year.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the three records count only because this read returns them to the incident producer. No dice. Speed: reads are by index and never scan the town.

**Done when.** A second session, on main in a drawn place (place and seed named), plays a year in dev mode and runs the read for one month: it returns the place's patrol-hours row, a crime place-month row and at least one grievance, each by record id. A test in src/core2 names the place, the seed and the ids.

**Waits on.** world-police-patrol-and-grievance-causes-part-1-patrol-hours and world-police-patrol-and-grievance-causes-part-2-grievance-record.

**Files.** src/core2/police-incident-reads.ts (new), src/core2/modules/crime.ts, src/core2/modules/police-patrol.ts (new), src/core2/modules/grievance.ts (new)
