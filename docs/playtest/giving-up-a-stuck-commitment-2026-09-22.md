# Four presses back to a normal week

Walked 2026-09-22 10:30Z on `claude/playtest-cwpd3o` at `be7d0c3d`, in
Chromium 141. Ordinary creator, Baltimore, Maryland, age 44. This is the
measurement of the guard built for the deadlock in
`committing-a-campaign-week-stops-time-2026-09-22.md`, and it is the gate that
decided whether the guard shipped. The unit suite cannot see any of it.

## What was measured

The stall reproduced first, so the walk is measuring the right thing:

- 9:10 AM → **10:00 AM** on Monday January 5 after committing the week and
  pressing the week control.
- A second week press: still 10:00 AM. Nothing moved.

Then, giving up each commitment the game will not let the player carry out,
and pressing the week control after each:

| Press | Gave up | Clock after                     |
| ----- | ------- | ------------------------------- |
| 1     | 1       | Monday January 5, 2:00 PM       |
| 2     | 1       | Monday January 5, 6:00 PM       |
| 3     | 1       | Tuesday January 6, 10:00 AM     |
| 4     | 1       | **Tuesday January 13, 7:00 AM** |
| 5     | 0       | Tuesday January 20              |
| 6     | 0       | Tuesday January 27              |
| 7     | 0       | Tuesday February 3              |
| 8     | 0       | Tuesday February 10             |

Giving up itself never moved the clock, in any round.

## What that settles

**The guard works rather than moving the wall.** After the fourth give-up the
life is on a seven-day rhythm — 13, 20, January 27, 3, February 10 — which is
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

## Confirmed in a second town, on a differently shaped week

Measured 2026-09-22 10:55Z in **Denver, Colorado**, where a committed week
holds six bookings rather than Baltimore's four. Three of them carry the
journey refusal and are given up one at a time; the remaining three — a
fundraising call, a journey to a public meeting, and the meeting — refuse to
be performed and are never offered for give-up.

That looked at first like the guard failing to cover this shape. It is not.
With those three still on the calendar and no give-up control on any screen,
the week control moves a full seven days, six presses running: 12, 19, 26
January, 2, 9, February 16. **A booking that refuses to be performed is not
necessarily a booking that stops time**, and only the ones that stop time need
a way out.

So the guard holds in both towns, at three presses in Denver and four in
Baltimore, and the number is a property of the week rather than a constant.

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

## What the guard was also catching, found later

Walking Springfield, Illinois afterwards showed the guard doing a second job
nobody asked it to. A player who asks a party for an organizing meeting, then
presses "Make the journey" on the journey's own calendar row, completed the
travel and was then offered **Give up on this** on the meeting itself — a
commitment they had already walked to. The refusal underneath it said the game
could not tell where they were standing.

That was a separate defect, not this gap: the arrival was recorded only in the
branch the destination's own button takes, so pressing the journey's row
recorded nothing. It is fixed in PR #369 and written up in
`making-the-journey-stranded-the-meeting-2026-09-22.md`.

The correction to make here is about the guard, not the fix. **It was partly
masking a bug rather than only bounding the campaign gap.** A control that
releases any unperformable commitment will catch whatever makes one
unperformable, including causes that are repairable — so the guard appearing
somewhere is a signal worth chasing rather than a state to accept. It does not
change the case for the guard, which is that a life must never have no legal
move; it changes what seeing it should prompt.
