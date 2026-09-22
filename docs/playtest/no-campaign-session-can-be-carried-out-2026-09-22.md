# No campaign session can be carried out

Walked 2026-09-22 10:35Z on `main` at `f5006ef5`, in Chromium 141. Ordinary
creator, Denver, Colorado, age 44 — a third state, chosen so this is not a
Baltimore or Phoenix result. Filed for governor, committed one week, then
enumerated every entry on the calendar with each button's enabled state and
each refusal in its own words.

## The finding

**A committed campaign week contains six bookings and not one of them can be
pressed.** Not the first, and not any of the others after the queue ahead of
them is cleared.

As committed:

| #   | Entry                                                            | Button             | Enabled | Refusal                                                                |
| --- | ---------------------------------------------------------------- | ------------------ | ------- | ---------------------------------------------------------------------- |
| 0   | A field shift · Somebody's street — Colorado                     | Carry out activity | no      | the current location is not recorded, so no journey can be established |
| 1   | A field shift · Somebody's street — Colorado                     | Carry out activity | no      | an earlier commitment must be resolved first                           |
| 2   | A field shift · Somebody's street — Colorado                     | Carry out activity | no      | an earlier commitment must be resolved first                           |
| 3   | A fundraising call session · The campaign's call desk — Colorado | Carry out activity | no      | an earlier commitment must be resolved first                           |
| 4   | Journey to the public meeting · On the way to the public meeting | Make the journey   | no      | an earlier commitment must be resolved first                           |
| 5   | Posted public meeting · Public meeting room                      | Carry out activity | no      | an earlier commitment must be resolved first                           |

Giving up the head of the queue three times, re-reading the whole panel after
each, leaves this:

| #   | Entry                                                 | Enabled | Offered for give-up |
| --- | ----------------------------------------------------- | ------- | ------------------- |
| 0   | A fundraising call session · The campaign's call desk | no      | no                  |
| 1   | Journey to the public meeting                         | no      | no                  |
| 2   | Posted public meeting · Public meeting room           | no      | no                  |

All three still report "An earlier commitment must be resolved first", and
none is offered for give-up, so at that moment the screen offers the player
nothing to do with any of them.

## What this corrects

`a-year-of-campaigning-2026-09-22.md` recorded that twelve committed weeks
left the treasury at USD 0.00 with nothing else moved, and read that as the
campaign system sitting still while the player worked. **That reading is
withdrawn.** The arithmetic in that same walk gives it away: twelve committed
weeks, forty-eight sessions, and forty-eight cleared by _giving up_. Every
booking that life ever held was one it could not carry out.

So the honest statement is not "campaigning does nothing". It is **"the player
never campaigned, because no campaign session can be performed"**. Whether
performing one would move the treasury is untested and remains untested — the
door has never been opened.

## Why, at the line

`venueActivities` in `src/presentation/venue-activity.ts` refuses in two
stages. First `controlledCommitmentsBlockingActivityPerformance` returns the
commitments standing ahead of this one; any of them produces "An earlier
commitment must be resolved first". Only if that list is empty does it look for
a journey, and that second check is what produces the location refusal and the
`unperformable` flag the give-up control reads.

The campaign's venues are authored keys — `campaign-doors` ("Somebody's
street"), `campaign-call-desk`, `campaign-office` in
`src/simulation/campaign-weekly-plans.ts` — and nothing connects an ordinary
life to any of them, so the head of the queue always fails the journey check.
Each entry behind it fails the earlier-commitment check instead, which is why
only one give-up control is ever on the screen.

## The open question this leaves, stated rather than guessed

After the three field shifts are cleared, the fundraising call is the head of
the visible queue and still reports an earlier commitment. Either there is a
blocker the panel does not draw, or the blocker list counts something the
player cannot see. `controlledCommitmentsBlockingActivityPerformance` is where
that is decided, and this walk did not open it. It is named here rather than
explained, because a guessed explanation is worse than none.

## What this does to the design question

The three options in `committing-a-campaign-week-stops-time-2026-09-22.md` are
unchanged and still lamontae's, but the weight has moved decisively.

**Letting a campaign session happen where the player is stops being a
convenience and becomes the thing that makes campaigning exist at all.** Before
this walk it looked like a way to save presses. It is the difference between a
campaign the player can work and a campaign that is six bookings they can only
give up.
