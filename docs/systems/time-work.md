# Canonical Sub-Day Time, Scheduled Activity, and Office Work

Status: **Stage 6.5 Run D-Lite implementation contract**

## Canonical simulation moment

World schema 15 owns `currentMoment`, a JSON-safe `SimulationMoment` with:

- `date: IsoDate`;
- `minuteOfDay`, an integer from 0 through 1439;
- `timeZone`, a non-empty IANA-style zone identity; and
- `utcOffsetMinutes`, an integer from -840 through 840.

The explicit offset makes the represented instant deterministic without asking
the host runtime for a timezone database. The zone identity preserves the
geographic context needed by later travel systems. Moment comparison converts
the date and local minute through the stored offset; two differently zoned
moments may therefore represent the same instant. D-Lite does not infer future
daylight-saving changes or implement travel between zones.

`World.currentDate` remains the authoritative calendar date for date-level
systems and must equal `World.currentMoment.date`. Construction, transition,
integrity, snapshot-load, and persistence boundaries reject a mismatch or an
invalid minute, zone, offset, or date. `advanceWorld(world, days, handlers)`
still accepts positive whole days and preserves the current local minute, zone,
and offset. Snapshot format 14 round-trips schema 15 exactly.

Neither global history sequence nor `World.actionSequence` is elapsed time.
History sequence remains append order, including deterministic same-instant
ties. Action sequence remains the existing seeded whole-day action input.

## Exact advancement and date-level frontiers

`advanceWorldMinutes` is the one sub-day advancement path. It accepts a
positive integer minute count, computes the exact target moment, and resolves
crossed work/activity completions in moment order. Crossing a date boundary
updates both `currentMoment.date` and `currentDate`, then invokes the existing
future-due frontier for that date. A date-level `FutureDueItem` remains a dated
transition request and is never treated as an appointment.

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
between real context targets consumes no time. Attending the briefing explains
the 45-minute cost before committing it and then uses the canonical transition.
`PlayerOffice` remains the sole mutable owner of the immutable World.

Later campaign events, fundraising, canvassing, debates, constituent work,
legislative work, governing meetings, staff delegation, public events, and
authored travel can consume these same moment/activity/work records. They must
not replace them with React timestamps, history-order clocks, date-only
appointments, arbitrary work buckets, or wall-clock timing.
