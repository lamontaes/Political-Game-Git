# Making the journey stranded the meeting it was booked for

**Walked** 2026-09-22 in Springfield, Illinois, on `claude/playtest-cwpd3o` at
`59f36271`, Chromium 141 (not CI's browser). An ordinary life, age 34, no
campaign filed.

## What a player does

Ask the County of Sangamon Democrats for an organizing meeting. The game books
two things and the calendar draws both:

```
Journey to the community room · On the way to the community room   [Make the journey]
Organizing meeting with County of Sangamon Democrats · Community room   [Carry out activity]
```

"Carry out activity" on the second row is the designed press: it makes the
journey and attends the meeting in one action. "Make the journey" on the first
row is the other control — and it is the first enabled button on the screen.

## What pressing the first one did

The travel completed. The panel said so:

```
You have finished Journey to the community room at On the way to the community room.

Organizing meeting with County of Sangamon Democrats · Community room
[Carry out activity — disabled]  [Give up on this]
The current location is not recorded, so the game cannot establish a journey to Community room.
```

The meeting was refused for the rest of the life. Three further days passed
and the sentence never changed. The only control left on it was the give-up
guard from #350 — which is to say the guard was catching a commitment the
player had already traveled to.

**Twice in one walk.** The same thing happened first to a posted public
meeting, then to the organizing meeting, from two different producers.

## Why

`venueActivities` decides a destination is reachable by finding its journey
through `disclosedJourneyFor`, which requires that journey to still be
`scheduled`. Once the player performs the travel row on its own, the journey is
`completed`, so the lookup returns null and the code falls through to the
origin check. That check reads `openingLifeLocation`, which is fed by
`life.scene.arrived` events — and those were recorded only inside
`performVenueActivity`'s combined branch. Pressing the travel row took the
other branch, which recorded no arrival. The player was there and the game had
no record of it.

## The fix

`src/presentation/venue-activity.ts`: arriving is recorded the same way
whichever control was pressed. The arrival event is now one function,
`recordJourneyArrival`, called from both branches; performing a travel activity
on its own looks up the destination it was booked for through the same
`ATTEND_JOURNEYS` adapter table, from the travel side, and records the arrival
against it. No new route, no invented place, same adapters, same event key —
so a destination that was never authored a journey is still refused exactly as
before.

`src/presentation/journey-then-destination.test.ts` holds it, in Springfield
and Baltimore. Without the fix both fail on the walk's own sentence, "The
current location is not recorded"; with it the meeting is performable and
completes.

## Confirmed on screen, not only in tests

Passing tests is not visual approval, so the same walk was repeated in
Springfield on the fixed branch at `e717ecbc`, Chromium 141:

1. Press **Make the journey** on the journey's own row — "You have finished
   Journey to the public meeting at On the way to the public meeting."
2. The destination now reads **"75 minutes, including any wait before it
   begins"**, performable, with no refusal. This is the exact state that read
   "The current location is not recorded" before the fix.
3. Press **Carry out activity** — "You have finished Posted public meeting at
   Public meeting room."
4. The life carries on: the community-room journey and meeting become enabled
   at 1365 and 1425 minutes.

So the meeting at the far end of a walked journey is attended, on screen, by
the presses a player would make.

## A separate thing the walk turned up

**Boise, Idaho offers no organizing meeting at all.** Starting the same
ordinary life there, the Campaigns screen carried no control matching
"Organizing meeting", where Springfield offers two chapters with named hosts.
Whether that is a party-chapter data gap in Idaho or a different label on the
same thing is not established, and it is not being reported as a defect on one
probe. Recorded so the next walk starts there rather than rediscovering it.

## What this does not establish

- Whether the meeting produces anything worth attending once attended. This
  measured that it _can_ be, not what it _does_.
- Whether any other paired journey in the game has the same shape. Only the two
  routes in `ATTEND_JOURNEYS` exist, and both were walked here.
- The campaign sessions are untouched by this. They book no journey at all —
  `CampaignWeeklySessionEntry` still has no `journeyKey`, which is
  `what-campaign-sessions-are-missing-2026-09-22.md` and needs nine authored
  values that are the owner's to approve.
