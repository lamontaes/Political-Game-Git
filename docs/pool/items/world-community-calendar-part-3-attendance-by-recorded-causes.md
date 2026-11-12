---
id: world-community-calendar-part-3-attendance-by-recorded-causes
title: "People attend community events by their traits, ties and schedule"
area: world
kind: feature
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: world-community-calendar-part-2-event-records-on-scheduler
blocked-on:
lead: lives
model: opus
effort: medium
root: design-life-record
source: split from world-community-calendar in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Events exist as records after part 2; now people go to them. Each person who could attend decides from their own traits, their ties to others who will be there, their schedule and their health, and the decision is kept as an attendance record naming the person, the event and the reasons, for the player and the people the player deals with. Counted groups attend by the same rule times their count. An outcome such as a game's score or a contest's winner follows people's traits, skills and the place's conditions. Feeds: world-community-calendar

**Cause.** Design: docs/design/life-record.md, the owner's Nov 1, 2026 question recorded in the parent item, and the one-model-two-tiers rule in AGENTS.md.

**Fix.** In the community-events module, add the attendance decision through the existing choice machinery and give outcomes (scores, winners) from traits and skills; read the schedule from the existing work and school schedules. For a full person, write the attendance as an entry in that person's life record through the life record's one writer (docs/design/life-record.md), with its reasons by record id, not as a separate attendance table. For a counted group, keep one count per event and group, by the same rule times the group's count, and no record per person. Decide attendance on the event's date only, for the people and groups of the place holding it; never scan the whole world.

**Time box.** 6 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: who attends, and any outcome, follows traits, ties, schedule and conditions, never a roll or a fixed share. One model, two tiers: a counted group attends by the same rule as a full person times its count. Ask why: every attendance keeps its reasons by record id for the player and the people they deal with. An effect is a read, not a record: part 4 reads these records.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in three drawn places (names and seeds in the PR body), picks one event in each, and sees attendance records for named people with their reasons by record id, two people with different ties and schedules deciding differently, and no seeded roll anywhere in the path.

**Waits on.** world-community-calendar-part-2-event-records-on-scheduler, and the life record's writer (item core-life-record; on main once pull requests 8115, 8123 and 8139 merge).

**Files.** src/core2/modules/community-events.ts (new), src/core2/modules/life.ts, src/core2/community-events.test.ts (new)

**Notes (Fable B, Nov 10, the owner's answer).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). The owner set the size of the town events that day: the paper reports them and a candidate can campaign at one. Deciding who attends, person by person, is not part of it.
