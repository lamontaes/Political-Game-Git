---
id: world-community-calendar
title: "Towns have a year of community life from research: fairs, parades, festivals, homecoming and school seasons, church and club events, each a dated record the paper, journal and scenes read"
area: world
lead: lives
kind: bug
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
blocked-on: world-community-calendar-part-1-research-event-table, world-community-calendar-part-2-event-records-on-scheduler, world-community-calendar-part-3-attendance-by-recorded-causes, world-community-calendar-part-4-paper-and-journal-read-them
after: core-every-life-simulated
model: sonnet
effort: low
root: design-life-record
source: owner, Nov 1 ("there needs to be real ones with some good fluff or else it will get old")
checked: fable 2026-11-10
---

**What.** A played town has no community events at all: no county fair, Fourth of July parade, harvest or heritage festival, homecoming game, school play, church supper or club meeting, so the paper and the journal have nothing of ordinary town life to tell. This item gives every place a calendar of annual community events from research, sized by the place's population and type (a county seat has its fair; a college town its homecoming). Each event is a dated record. People attend by their own traits, ties and schedule. The paper, the journal and the scene engine read who went and what happened.

**Cause.** Design: docs/design/life-record.md and the owner's Nov 1, 2026 question ("there needs to be real ones with some good fluff or else it will get old"), in the Notes; nothing like it exists on main (searched the pool for festival, fair, parade, homecoming and community: no twin).

**Fix.** Build it in four parts, in order: world-community-calendar-part-1-research-event-table (a sourced table of events by place type and size), world-community-calendar-part-2-event-records-on-scheduler (dated event records on the existing scheduler), world-community-calendar-part-3-attendance-by-recorded-causes (attendance by recorded causes) and world-community-calendar-part-4-paper-and-journal-read-them (the paper and journal read them).

**Time box.** 24 hours in all, across the four parts; each part carries its own time box.

**Rules.** Simulate it, don't ask: the events and their seasons come from research by place type, calibrated and never hand-placed per town. One rule, all 56 places: no town is named in logic. No dice: who attends, and an outcome such as a game's score or a contest's winner, follows people's traits, skills and the place's conditions, never a roll. One engine per mechanic: the calendar and the existing scheduler, never a second one. An effect is a read: an event no engine reads is a placeholder.

**Done when.** A second session (not the builder) plays a one-year world in three drawn places (named with seeds) and sees each place with dated community-event records sized to the place, people attending by recorded causes (record ids named), and the paper or the journal reading at least two of them. The speed bar holds: a year within 20 percent of base. This item is done when its four parts are.

**Waits on.** The four parts: world-community-calendar-part-1-research-event-table, world-community-calendar-part-2-event-records-on-scheduler, world-community-calendar-part-3-attendance-by-recorded-causes, world-community-calendar-part-4-paper-and-journal-read-them; core-every-life-simulated for the engine parts.

**Files.** src/core2/modules/community-events.ts (new), src/core2/data/world/community-events.json (new), src/director/

**Notes.** Filed by the CTO, Nov 1 18:00, on the owner's question. Words words the stories (`words-paper-and-journal-everyday-life`). Searched the pool for festival, fair, parade, homecoming and community: no twin.
