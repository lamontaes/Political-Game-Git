# What campaign sessions are missing, exactly

Measured 2026-09-22 11:30Z on `main` at `cbc6894f`, Chromium 141 and source at
that head. This locates the cause behind the deadlock, the guard and the empty
treasury in one place, and it stops at the point where the next step is
lamontae's rather than mine.

## The nine blanks, with a recommendation beside each

Answer these nine and campaign sessions become performable. Everything else is
already built and already works. Recommendations are drawn from what the game
already does elsewhere; the constraint that produced each one is named so a
different answer can be given knowingly.

**A field shift — `campaign-doors`, "Somebody's street"**

| Blank           | Recommendation          | The constraint behind it                                                                                                                                                                                         |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journey key     | `campaign:to-the-doors` | Matches the naming of `ordinary-life:to-meeting-room`, the only other journey to a meeting place                                                                                                                 |
| Journey minutes | 20                      | The party route's local journeys run 20–30; a canvass starts in the neighbourhood you live in                                                                                                                    |
| Scene row       | **no room, and say so** | Canvassing is outdoors. Every released scene in the game is an interior and no environment family describes an outdoor space, which is the reason `campaign-doors` itself already gives. See the art note below. |

**A fundraising call session — `campaign-call-desk`**

| Blank           | Recommendation                       | The constraint behind it                                                                                                                              |
| --------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journey key     | `campaign:to-the-call-desk`          | Same naming                                                                                                                                           |
| Journey minutes | 25                                   | Travelling to the campaign's own storefront, not a neighbour's street                                                                                 |
| Scene row       | no room (journeys never resolve one) | `SCENE_VENUES` states a journey never resolves a room even when both endpoints have one. The desk itself already resolves to the campaign storefront. |

**Signing off an advertising buy — `campaign-office`**

| Blank           | Recommendation                       | The constraint behind it                                         |
| --------------- | ------------------------------------ | ---------------------------------------------------------------- |
| Journey key     | `campaign:to-the-campaign-office`    | Same naming                                                      |
| Journey minutes | 25                                   | Same building as the call desk                                   |
| Scene row       | no room (journeys never resolve one) | As above; the office already resolves to the campaign storefront |

A one-line answer is enough: "yes to all nine", or name the ones to change.

**An art note, and the art is already asked for.** A field shift happens
outdoors and the game owns no outdoor scene, which is why `campaign-doors`
resolves to no room today. Checked before filing anything: the request already
exists — **`env-neighborhood-doorstep-generic`, "A generic neighborhood
doorstep and sidewalk", P1, queued** in `art/requests/asset-requests.json`.
Nothing new needs filing, and no duplicate has been added.

So the first row's recommendation costs nothing either way: ship with no room
and the reason attached, which is what the game already does everywhere else,
and bind the doorstep plate to `campaign-doors` when it lands. The journey
itself resolves no room regardless, since `SCENE_VENUES` states a journey
never resolves one even when both its endpoints do.

## Venue activities work. Measured, not inferred.

In Springfield, Illinois — an ordinary life, no campaign — the Campaigns
screen carries a section nobody in this lane had walked. Under **Ask for
something**, two named party chapters with named hosts (County of Sangamon
Democrats with Kevin Young; Republicans with Jordan Chandler), each offering
an organizing meeting, a door canvass, a phone shift, talking about running
for office, and a community town hall:

> Asking puts it on the first evening in the next two weeks that you and the
> host both have free. No time passes now.

Asking for an organizing meeting booked two things: a journey to the community
room, and the meeting. The next morning the journey read **enabled**, "690
minutes, including any wait before it begins", and pressing it worked:

> You have finished Journey to the public meeting at On the way to the public
> meeting.

The clock moved 7:00 AM to 6:30 PM. **A journey can be made.** So the journey
system is not broken, and "An earlier commitment must be resolved first" is a
_time-ordering_ refusal rather than a wall — the entry became performable when
its hour came.

**Now established, and it was a defect.** The meeting at the far end could
_not_ be attended. This very press — finishing the journey on its own row —
completed the travel and recorded no arrival, so the meeting refused "The
current location is not recorded" for the rest of the life. Walked again in
Springfield, Illinois and reproduced twice in one walk; written up in
`making-the-journey-stranded-the-meeting-2026-09-22.md` and fixed in PR #369,
which records the arrival whichever control the player pressed. So the
sentence above stands corrected: a journey can be made, and now the activity
at its far end can be performed too. They were different sentences, and the
gap between them was the bug.

## The difference, at the type level

`writeHold` in `src/simulation/campaign-life-activities.ts` books the party
activity and then, **if the catalogue entry names a journey**, books the
journey alongside it:

```ts
if (entry.journeyKey === null) return next;
...
kind: "travel",
start: addSimulationMinutes(args.start, -entry.journeyMinutes),
end: args.start,
location: { locationKey: entry.journeyKey, ... }
```

`CampaignWeeklySessionEntry` in `src/simulation/campaign-weekly-plans.ts` has
**no `journeyKey` and no `journeyMinutes` at all**. Its three entries are:

| Session                        | Venue key                              | Journey |
| ------------------------------ | -------------------------------------- | ------- |
| A field shift                  | `campaign-doors` ("Somebody's street") | none    |
| A fundraising call session     | `campaign-call-desk`                   | none    |
| Signing off an advertising buy | `campaign-office`                      | none    |

So a committed campaign week books a place to be and no way of getting there,
while the party route books both. That is the whole cause, and it explains
every symptom this lane has recorded: the first session refuses on the journey
check, everything behind it refuses on time ordering, time cannot step over a
confirmed commitment, and the treasury never moves because the player never
performs anything.

## Where this stops being plumbing

Adding the two fields to the type and booking the journey the same way is
mechanical. **What to put in them is not, and that is the boundary.**

`SCENE_VENUES` in `src/presentation/scene-venues.ts` holds exactly two journey
keys in the whole game — `ordinary-life:to-meeting-room` and
`office-to-east-end` — and neither goes to a campaign venue. The table's own
comment says why that matters:

> A key that is not in this table gets no room and says so, which is what
> keeps a newly authored activity from silently inheriting somebody else's
> picture.

So making campaign sessions reachable needs **nine authored values that are
lamontae's to approve, not mine to invent**: for each of the three venues, a
journey location key, a journey duration in minutes, and a `SCENE_VENUES` row
with a stated reason. Inventing them here would be exactly the substitution
the house rules forbid, and `campaign-doors` already carries a reason that
bears on it — canvassing happens outdoors, every released scene is an
interior, so no room is borrowed.

**No pull request is opened for this.** The mechanical half is a few lines and
worth nothing without the authored half, and shipping the fields with invented
values would look like a fix while quietly deciding something he has not been
asked.

## What he is actually being asked, in one paragraph

The first of the three options in
`committing-a-campaign-week-stops-time-2026-09-22.md` — let a campaign session
happen where the player is — is narrower than it looked. The machinery already
exists and already works for party activities. Campaign sessions need the same
two fields filled in, which means naming a journey to a street, a call desk
and a campaign office, how long each takes, and what room (or honest absence
of one) each resolves to. Nine values. Everything else is already built.
