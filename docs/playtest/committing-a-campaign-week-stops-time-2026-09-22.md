# Committing a campaign week stops the clock, permanently

Walked 2026-09-22 09:45Z on `main` at `ce6a5f32`, in Chromium 141. Ordinary
creator, Baltimore, Maryland, age 44. Reproduced four times, and held against
a control run that differs by one press.

**This is the most serious thing any walk in this lane has found. It ends the
game.**

## The repro

1. Start an ordinary life in Baltimore, Maryland.
2. Politics → Campaigns → **Put your name in** under "The state's top
   office". A governor's campaign opens.
3. Press **Commit this week**.
4. Press the week control.

The clock moves from 9:10 AM to 10:00 AM on Monday 5 January 2026 and then
never moves again. Pressing the week control a second, third and fourth time
changes nothing. Neither does the day control, "Get on with the day", or any
item under "Waiting on you". The life is over at 10:00 AM on its first
morning.

**The control run.** The same life, filed for governor, week control pressed
three times **without** committing: Monday 12 January, Monday 19 January,
Monday 26 January. One press of "Commit this week" is the whole difference.

## Why, in one chain

Committing books real sessions on the calendar — the week is on it:

> 5 (Today) · 10:00 AM A field shift · 2:00 PM A field shift · +2 more
> 6 · 10:00 AM A fundraising call session · 6:10 PM Journey to the public
> meeting · +1 more

The first of them cannot be carried out. The calendar says so plainly:

> A field shift · Somebody's street — Maryland — **Carry out activity**
> The current location is not recorded, so the game cannot establish a
> journey to Somebody's street — Maryland.

And every later entry then says:

> An earlier commitment must be resolved first.

So the first session is unperformable, which blocks the rest, and a confirmed
commitment is exactly what time refuses to step over. `advanceOrdinaryDays`
in `src/presentation/ordinary-life.ts` releases only a **tentative** activity
at the boundary — its comment says confirmed commitments and travel fall
through unchanged — so the advance stops at 10:00 AM and returns, every time,
with nothing changed.

The refusal itself is `src/presentation/venue-activity.ts:144`:

```ts
const origin = openingLifeLocation(world, personId);
if (!origin) {
  refusal = `The current location is not recorded, so the game cannot establish a journey to ${activity.location.label}.`;
} else if (origin.label !== activity.location.label) {
  refusal = `No authored journey connects ${origin.label} to ${activity.location.label}. The supported office-to-East-End route does not establish this distance, time, or cost.`;
}
```

`openingLifeLocation` reads the last `life.scene.opened` or
`life.scene.arrived` event's recorded location, and this life has none.

Note the second branch, because it matters for any fix: even with a recorded
location, a campaign session is performable only if the player is **already
standing at its venue**, since the only authored journey is an
office-to-East-End route. The campaign's three venues are authored keys —
`campaign-doors` ("Somebody's street"), `campaign-call-desk`,
`campaign-office`, in `src/simulation/campaign-weekly-plans.ts` — and nothing
connects an ordinary life to any of them.

## The part that is a defect whatever gets decided

Refusing to invent a journey is correct and is the house rule working. What
is not defensible is the dead end it leaves:

- The session cannot be performed.
- The session cannot be declined — `declinable` in `venue-activity.ts` is
  true only for a **tentative** activity, and a committed campaign session is
  not tentative.
- Time cannot pass it.
- There is no other control on any screen that resolves it.

**The game can reach a state with no legal move.** That is true no matter how
the journey question is answered, and it is separate from it: a commitment
the player cannot perform, decline, or outlive is a trap, and time
advancement should not be able to deadlock on one.

## A way out exists now, and it is not the fix

Landed on `claude/playtest-cwpd3o` at `be7d0c3d`: a commitment the game will
not let the player carry out can be given up. It takes no time and spends
nothing, and it clears the commitment and any journey booked for it.

Measured in `giving-up-a-stuck-commitment-2026-09-22.md`: **four presses**,
one per booked session, each offered on the calendar with nothing to hunt for,
and after the fourth the life is on an ordinary seven-day rhythm. So the clock
is unstuck; the life is not free until the week is cleared.

That is a guard, not an answer to the question below, and its cost scales with
how much the player campaigns.

## The decision this needs, which is not mine

Three ways out, and choosing between them is a product call:

1. **Let a campaign session happen where the player is.** Doors, a call desk
   and an office are places a campaign brings with it; a field shift does not
   obviously need an authored journey.
2. **Author the journeys**, from an ordinary life's home to the campaign's
   three venues, in every place a life can start.
3. **Make a committed campaign session declinable**, so a player can always
   drop one and move on.

They are not exclusive, and only the third addresses the deadlock on its own.

## What this walk did not establish

- **Whether the same trap exists for non-campaign commitments.** The
  mechanism is general — any unperformable confirmed commitment would do it —
  but only campaign sessions were reached here.
- **Whether a life whose location _is_ recorded gets past it.** The second
  refusal branch suggests not, unless the player is already at the venue, but
  that was not walked.
- **Whether a saved game can be recovered** once in this state. This life was
  never saved.
