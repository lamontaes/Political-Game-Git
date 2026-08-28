# Canonical Sub-Day Time, Scheduled Activity, and Office Work

Status: **Stage 6.5 Run D-Lite implementation contract**

## Canonical simulation moment

World schema 15 owns `currentMoment`, a JSON-safe `SimulationMoment` with:

- `date: IsoDate`;
- `minuteOfDay`, an integer from 0 through 1439;
- `timeZone`, an actually supported IANA zone identity; and
- `utcOffsetMinutes`, an integer from -840 through 840.

The explicit offset makes the represented instant deterministic. Construction,
integrity, and advancement also consult the runtime's IANA data to prove that
zone, local date/minute, and offset describe that same instant; regex-shaped
names such as `Fake/Zone` reject. The zone identity preserves geographic
context. Moment comparison converts local date/minute through the stored
offset, so differently zoned moments may represent the same instant.

`World.currentDate` remains the authoritative calendar date for date-level
systems and must equal `World.currentMoment.date`. Construction, transition,
integrity, snapshot-load, and persistence boundaries reject a mismatch or an
invalid minute, unsupported zone, inconsistent offset, or date.
`advanceWorld(world, days, handlers)` still accepts positive whole days and
preserves the intended local minute and zone while resolving the offset valid
on the target date. Ambiguous local times prefer the prior offset when valid;
nonexistent local times reject. Snapshot format 14 round-trips schema 15
exactly.

Neither global history sequence nor `World.actionSequence` is elapsed time.
History sequence remains append order, including deterministic same-instant
ties. Action sequence remains the existing seeded whole-day action input.

## Exact advancement and date-level frontiers

`advanceWorldMinutes` is the one sub-day advancement path. It accepts a
positive integer minute count, advances the represented instant exactly, and
derives the resulting local date, minute, and offset even across daylight-saving
transitions. Crossing a date boundary updates both `currentMoment.date` and
`currentDate`, then invokes the existing future-due frontier for that date. A
date-level `FutureDueItem` remains a dated transition request and is never
treated as an appointment.

Before committing a generic minute move, the transition checks every scheduled
activity involving the controlled person. If the target would cross an
unresolved activity start, including travel, it returns the exact input World.
An explicit activity-performance path may consume that activity's own wait and
interval, but rejects to the exact input World if an earlier unresolved player
commitment would be skipped. This is a hard boundary, not a late-arrival or
missed-appointment model.

At the same represented instant, resolution uses a fixed deterministic order:
date boundary and its due work, then work completion, then selected scheduled
activity completion, with stable creation sequence breaking ties inside a
family. Exact-time state records point to ordinary date-level
`HistoricalEvent` outcomes. Terminal state and stable-key checks prevent a
completion from being recorded twice. Any failed transition returns no partial
World.

## Scheduled activities

A `ScheduledActivityRecord` is immutable identity and authored context:

- stable deterministic ID, key, creation sequence, and creation moment;
- title, summary, confirmed/tentative/flexible/travel kind;
- participants and responsible person;
- authored location with optional jurisdiction;
- source entity IDs and office/private access;
- fixed or bounded movable flexibility.

`ScheduledActivityStateRecord` is append-oriented state. It stores the exact
start and end moments, scheduled/completed/cancelled status,
created/rescheduled/completed/cancelled change, superseded state, and optional
ordinary outcome event. Duration is always derived from the interval.

Conflict validation compares half-open represented-instant intervals for every
shared participant. Creation rejects overlap. A fixed activity cannot move. A
flexible activity moves only through an explicit deterministic reschedule whose
new interval remains inside its authored range and conflicts with no shared
participant commitment. A rejected result names its reason/conflicts and
returns the exact input World unchanged.

Travel is an ordinary fixed scheduled interval with participants, place,
duration, and provenance. The D-Lite fixture authors 20 minutes from the office
to an off-site meeting. Because the player and Collins participate, another
activity cannot consume that interval or manufacture instantaneous arrival.
Routing, traffic, and map simulation remain deferred.

## Work and Work/Pending projection

A `WorkItemRecord` owns stable identity, title/summary, jurisdiction, source
entities, access, a typed focus back to a person, legislative material,
calendar item, or other real entity, and optional authored required minutes.
Its append-oriented state owns lifecycle, assignees, whether the controlled
player must decide/act/neither, waiting-on people, blocker, elapsed work,
optional scheduled-activity linkage, outcome event, and supersession.

The player-facing groups are derived each time:

- **Needs you**: the controlled player is assigned or the state explicitly
  requires their decision/action.
- **Waiting on others**: the active state has at least one waiting-on person.
- **Staff handling**: active, nonblocked work is assigned to another person and
  requires no player act.
- **Completed / ready to review**: the state is ready for review or completed.

No bucket string is canonical. A waiting item has no player completion path.
Delegation is an explicit assignment transition with ordinary history and
provenance; presentation state cannot perform it silently.

During exact elapsed time, active staff work gains minutes only when each
assigned staff person is free of overlapping scheduled commitments. Reaching
the authored duration appends one ready-for-review state and ordinary outcome
event at the exact completion moment. The bounded fixture proves Collins's
50-minute analysis completes at 10:00 while the player attends a separate
9:30–10:15 briefing. No progress percentage is canonical or player-facing.

## Epistemic and product boundary

Agenda and work projections filter their root records through the controlled
person's access. The fixture includes one private Reed commitment and one
private Reed work item; neither reaches the projection, DOM, accessible text,
or Work/Pending group counts. Office-accessible staff ownership does not grant
access to unrelated private work.

Calendar and Work/Pending are dedicated, explicitly opened planning surfaces.
Opening, closing, navigating, selecting an event, reading its detail, or moving
between real context targets consumes no time. Every future visible activity
for which the controlled player is responsible projects its canonical wait,
duration, resulting moment, chronological blockers, and one bounded verb:
Work, Travel, Attend, or Begin. The Calendar submits the selected activity ID
to `performScheduledActivity`; it does not special-case briefing identity or
invent completion. Attending the first briefing explains the 20-minute wait,
45-minute activity, and 65-minute total before committing the exact
9:10–10:15 transition. The same path then performs the 10:30–11:30 flexible
work block, 1:40–2:00 travel, and 2:00–3:15 meeting in canonical order.
Blocked execution returns the exact World and names the earlier commitment;
completed activities expose no repeat action.
`PlayerOffice` remains the sole mutable owner of the immutable World.

Later campaign events, fundraising, canvassing, debates, constituent work,
legislative work, governing meetings, staff delegation, public events, and
authored travel can consume these same moment/activity/work records. They must
not replace them with React timestamps, history-order clocks, date-only
appointments, arbitrary work buckets, or wall-clock timing.
