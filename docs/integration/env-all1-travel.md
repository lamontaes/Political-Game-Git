# ENV travel adapter v1

`src/presentation/place-travel.ts` owns `travelToPlace` and its `PlaceTravelProvider`
contract. It composes the existing scheduled-activity clock and history. No new
World store, routing engine, provider catalog, county crosswalk or implicit speed.

The provider owns exact endpoint keys, labels, jurisdiction IDs, settings,
participant authorization, and explicit duration evidence. Unknown returns
`unavailable`. Supported duration bases are `authored-scenario` and
`source-observation`; neither is silently upgraded to measured geography.

The origin must be the latest `life.scene.opened` or `life.scene.arrived` event
for the actor and match the route's label/setting/jurisdiction. The adapter checks
person control and living participants, creates an explicit travel activity,
performs its exact interval through the canonical clock, checks completion,
rechecks the provider after time passes, and only then records arrival. A blocked
commitment returns the original World, including no orphaned scheduled journey.
If eligibility changes during elapsed time, the elapsed result is preserved with
no fabricated arrival. Reads and pins never call this action.

OPENING-LIFE1 retains its household/age/guardian provider and authored five-minute
home/neighborhood content. Replace the provisional minute-only walk with this
adapter, then call `openNextLifeScene` only if a new arrival event was appended.
Normal-root integration belongs to UI-core. Non-home places with no supported
released scene resolve to no plate; returning home requires another explicit
arrival. A completed journey without arrival never becomes home by fallback.

MUNI retains government/series/source-confirmed venue identity and attendance;
`resolveActivityVenueScene` consumes its explicit binding with canonical completed
participant evidence. JUD's current workplace preparation does not establish a
courtroom type and therefore cannot select the courtroom plate.

Pending source-dependent work: route providers for actual workplace destinations,
transport schedules/durations/access where not scenario-authored, and exact
county/place/government-unit crosswalks. The recovered ENV checkout contains none
of those providers. No guessed values or name-only joins are substituted.
