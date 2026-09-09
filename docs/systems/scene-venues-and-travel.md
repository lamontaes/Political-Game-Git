# Scene venues and bounded travel

ENV-ALL1 extends the accepted scene registry and scheduled-activity substrate.
It does not introduce a World store, a clock, a map, or a second scene schema.

## Scene selection

`resolveVenueScene` is a pure immediate-aftermath projection. It requires a
completed activity at the current exact moment, access, actual participant
membership, and the completion event's `presence:participant` evidence. A
scheduled interval or public invitation never establishes attendance. Scene
binding additionally requires a matching location key and released production
raster. Travel completion does not prove entry to its destination's room.

`resolveActivityVenueScene` accepts an explicit feature-owner binding. The owner
must establish venue kind independently of the image, jurisdiction name, or
activity label. MUNI owns government/meeting identity and attendance; JUD owns
court identity and work authority. Missing kind or unreleased art remains a gap.

`resolveLifeScene` preserves the household scene as residence context only when
no later established place or unresolved travel contradicts it. A canonical
non-home arrival/opened scene without a supported binding returns no plate.
People come from the same canonical context, not from the household list carried
into a different room. UI owns that caller; PEOPLE owns compatible placement.

## Actions and travel

`VenueActivityPanel` submits `performVenueActivity` to the caller's sole World.
It exposes actual elapsed time, revalidates ownership/access/commitments, and
uses the accepted activity and transition primitives. It owns no save state.

`travelToPlace` takes a versioned provider offer. The provider supplies explicit
endpoints, participants and duration evidence. The adapter verifies the latest
origin event, schedules and performs travel, checks completion, revalidates the
provider and living participants after elapsed time, then appends arrival.
A refused route/conflict returns the original World. If circumstances change
while time elapses, elapsed history is preserved without claiming arrival.

The OPENING provider's five-minute local walk is authored scenario content.
No measured distance/speed, national route coverage, provider availability,
county/government-unit equivalence, or workplace commute is inferred.

## Art and acceptance

Courtroom master and derived tiers remain unreleased. Its anchor and occluder
geometry is explicitly image-space visual estimation, with body-scale calibration
and alpha masks unresolved. A preview is not release. The community hall reuses
existing approved pixels and metadata; baked figures are anonymous decoration,
never canonical people or attendance evidence.

Scene specs, source dispositions, runtime consumer mappings and integration
patches have different evidentiary roles. Normal-player proof must test the
composed UI route with actual pointer and keyboard activation. Automated tests,
registered scenes and development exercises do not confer human acceptance.
