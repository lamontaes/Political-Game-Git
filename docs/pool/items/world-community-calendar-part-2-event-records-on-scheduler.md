---
id: world-community-calendar-part-2-event-records-on-scheduler
title: "Community events are dated records on the existing scheduler, sized to the place"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: core-every-life-simulated, world-community-calendar-part-1-research-event-table
blocked-on:
lead: lives
model: opus
effort: medium
root: design-life-record
source: split from world-community-calendar in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** With the event table in place, a played town needs its events to happen on their dates as records. A module reads the table for the town's place type and size and writes one dated community-event record for each event as its date arrives, through the existing scheduler and no second one. The record names the event kind, the place, the date and the size the table gives; attendance and the stories come in the next parts.

**Cause.** Design: docs/design/life-record.md, the owner's Nov 1, 2026 question recorded in the parent item, and the dated-entries calendar modules already use in src/core2/module-calendar.ts (confirmed Nov 10: it is the one calendar of dated entries that modules book work on; there is no other scheduler).

**Fix.** Add a community-events module (src/core2/modules/community-events.ts, new) that reads the table from part 1 and posts a dated event record on each date through the existing scheduler; delete nothing else, add no second scheduler.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the calendar uses the existing scheduler, never a second one. Wire to the world: an event no engine reads is a placeholder, so this part is finished only with part 3 reading it. Speed: no scan of the whole world each day; the module acts on the day an event is due, and the played year stays within 20 percent of base on `npm run speed:year`. One rule, all 56 places.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in three drawn places of different types (names and seeds in the PR body) and sees dated community-event records sized to each place, listed by record id, posted on their dates through the existing scheduler; the speed bar holds.

**Waits on.** world-community-calendar-part-1-research-event-table (the table).

**Files.** src/core2/modules/community-events.ts (new), src/core2/module-calendar.ts, src/core2/community-events-table.ts (new), src/core2/community-events.test.ts (new)
