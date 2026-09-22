# Four presses back to a normal week

Walked 2026-09-22 10:30Z on `claude/playtest-cwpd3o` at `be7d0c3d`, in
Chromium 141. Ordinary creator, Baltimore, Maryland, age 44. This is the
measurement of the guard built for the deadlock in
`committing-a-campaign-week-stops-time-2026-09-22.md`, and it is the gate that
decided whether the guard shipped. The unit suite cannot see any of it.

## What was measured

The stall reproduced first, so the walk is measuring the right thing:

- 9:10 AM → **10:00 AM** on Monday 5 January after committing the week and
  pressing the week control.
- A second week press: still 10:00 AM. Nothing moved.

Then, giving up each commitment the game will not let the player carry out,
and pressing the week control after each:

| Press | Gave up | Clock after                     |
| ----- | ------- | ------------------------------- |
| 1     | 1       | Monday 5 January, 2:00 PM       |
| 2     | 1       | Monday 5 January, 6:00 PM       |
| 3     | 1       | Tuesday 6 January, 10:00 AM     |
| 4     | 1       | **Tuesday 13 January, 7:00 AM** |
| 5     | 0       | Tuesday 20 January              |
| 6     | 0       | Tuesday 27 January              |
| 7     | 0       | Tuesday 3 February              |
| 8     | 0       | Tuesday 10 February             |

Giving up itself never moved the clock, in any round.

## What that settles

**The guard works rather than moving the wall.** After the fourth give-up the
life is on a seven-day rhythm — 13, 20, 27 January, 3, 10 February — which is
an ordinary week and not a slower version of the trap.

**The cost is a press, not a hunt.** Exactly one control was on the calendar
each round, on the screen the commitment already lives on, and it was found
immediately every time. The reason is in the discriminator: only the session
at the head of the queue carries the journey refusal, so only it is offered.
The ones behind it say "An earlier commitment must be resolved first", which
is a different refusal and is not treated as unperformable. Clearing the front
promotes the next. That is four presses in a row, not four things to find.

**The honest sentence is "the clock is unstuck", not "the life is free".** A
committed week books four sessions and each one stops time in turn.

## The weight this puts on the design question

The three options at the end of the deadlock document are still open and still
his. This measurement adds one fact to the comparison: **the guard's cost
scales with how much the player campaigns.** Four presses to escape one
committed week is a nuisance; a player who campaigns every week for a year
pays it every week. That makes the first option — let a campaign session
happen where the player is — the one that removes the cost rather than
bounding it. Recorded next to the options rather than as a recommendation.

## A note on what walks can and cannot cover

The ten-week Baltimore walk in `ten-weeks-in-baltimore-2026-09-22.md` let far
more time pass than this one and never hit the deadlock, because it never
pressed **Commit this week**. This walk broke on its first morning because it
did. Neither walk was wrong.

So a walk's coverage is defined by which controls it presses, not by how much
time it lets pass. No amount of passing time substitutes for pressing the
thing a player would press.
