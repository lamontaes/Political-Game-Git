# LEG-CONTENT1 recipient interfaces

The current owner is the exclusive Codex LEG-CONTENT1 recipient. Recovery:
`8ff4d67996659d3053619b601c6ab2c75f6652e5`; accepted main merged at
`03fb9b450f194f19f0c74a14ba972d97450914c5`. Final publication SHA and test state
belong in the owning plan/PR, not a moving promise here.

## UI-core

`DocketWorkspace` exports `DocketWorkspaceProps`: canonical `world`,
`playerPersonId`, supported `scenarioKey`, canonical `jurisdictionId`,
`onWorldChange(world)`, `onGoToFloor(DocketBill)` and `floorNote`.
The recovered 36-line `PlayerGame.tsx` integration is retained without further
root edits. All new controls/style stay in `DocketWorkspace.tsx` / `docket.css`.
The component emits normal World updates for explicit filing, selection and
conditional estimate requests. It creates no separate World or save store.

`legislation-docket-selection.ts` reads/writes selected working bill through
private ordinary historical events. `legislation-estimate-action.ts` exposes
prepare/request/private-projection functions, refuses stale inputs and never
realizes effects. Keep the existing World persistence path for both.

## ENV

The existing `onGoToFloor` invokes `openLegislativeBargaining(world,
{ playerPersonId, docketKey })` and consumes its `{world, seat}` or unavailable
result. This is a work/document context, not a physical-travel writer. Neither
a room key nor the displayed members' room proves arrival or attendance.
ENV owns canonical located activity/presence; future composition should resolve
location from those records before rendering venue art. LEG owns bill identity,
current chamber, legal steps and authority refusal. No room-specific assets or
travel mutation is added here.

## MUNI / shared catalogs

No recipient edits to `legislation.ts`, `legislature-rules.ts` or
`legislature-rule-packs.ts`. Municipal rule consumers remain with MUNI.
The feature reuses existing policy metric/mechanism catalogs unchanged.
A minimal optional `fiscalPeriod: "annual"` on canonical provisions is validated
by the existing provision writer/integrity checker; omission leaves accepted
legacy records byte-shape-compatible. This is period metadata, not a new engine.

Same-project thread tools were searched but are not callable in this session.
Incoming ENV/MUNI coordination was received; this concrete contract preserves
the handoff without pretending an outgoing message or cross-task integration
already occurred.

ENV follow-up: PR #142 at `97fbcdef` exposes
`resolveActivityVenueScene(world, personId, activityId, explicitVenue)`. This
lane has no performed-and-located activity or source-confirmed chamber room
kind to pass to it. Binding is unavailable until canonical activity/location
records exist; the current members’ room route is preserved.
