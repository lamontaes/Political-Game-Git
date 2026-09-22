# Incoming art requests

Any thread that notices a missing picture files it here. One JSON file per
request, named for its `requestId`. Filing is creating a new file, so two
threads working on two branches never conflict and no ask is lost to a merge.

Schema and rules: `src/authoring/art-request-intake.ts`.

## File one

Write the record, then:

```
npm run intake:request -- file path/to/record.json
```

It validates first and writes nothing if the record is incomplete. Then commit
the file it created under this directory.

## Read the queue

```
npm run intake:request -- list     # open requests, most urgent named first
npm run intake:request -- check    # validate every record; non-zero on error
```

## What a record must answer

Four things, because they are what somebody who saw the gap actually knows:

- `missing` — what picture is absent.
- `consumerSite` — where in the game it belongs, and what the player was doing.
  `runtimeComponent` may be `"none"` when nothing consumes it yet.
- `jurisdiction` — the place it was seen in, as a `specific` place or as
  `jurisdiction-independent` **with a reason**. A blank answer is refused,
  because a blank one reads later as nationwide.
- `whyNeeded` — why it matters for play, so it can be ranked against other gaps.

## One more thing, outdoors only

If the request is for an **outdoor** environment plate, it must also say what
the picture shows: `visualContext.seasons`, `landform` and `sceneKind`. A
season written only in a note is how a winter scene ends up standing in for
July — nothing can act on prose. At promotion those tags become the first
acceptance criteria on the bench request, so a delivery in the wrong season can
be failed rather than argued about.

Interiors are asked none of this. Reporting that a community room has no art
should not require classifying vegetation.

## Figures declare a posture

If the request is for a **figure** (a body plate), give a `figureContext` with a
`postureClass` from the pose families' own set — `standing`, `seated`,
`leaning`, `podium-or-lectern`. A non-standing posture must also name its
`postureCues`: the visible marks that make it that posture, such as
`bent-knees` and `thighs-forward`. A plate labeled `seated` that is really a
short upright figure passes every geometric contact check, so the cues are what
a reviewer fails the wrong pose on. At promotion they become an acceptance
criterion that names the exact wrong delivery.

You are not expected to search the whole catalog before filing. That happens at
promotion, when `promoteToAssetRequest` carries the record into the Art Bench's
own `AssetRequest` shape and demands the inventory check, the recipe and the
acceptance criteria.

## Example

`example-community-room-interior.json` is an interior, asked the four
questions. `example-outdoor-regional-plate.json` is an outdoor plate, asked
those and the look as well.
