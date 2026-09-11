# DISTRICTS13 → UI / LAND owner (task A)

Recipient: LAND13 / UI composition owner. Builder: DISTRICTS13. This is a feature-local contract. Do not treat it as PlayerGame or global-navigation ownership.

Base: current `main` at the DISTRICTS13 publication SHA. Fiscal query/work files on this branch match Fiscal166; keep one copy if LAND already has them. This lane does not hold Fiscal166 for a fabricated Alaska membership journey.

## Mount

Import `DistrictResidencePanel` from `src/player/DistrictResidencePanel.tsx` and render it beside the existing campaign workspace. It already uses `world`, `personId`, and `onWorldChange`. No App/PlayerGame/global-navigation edits are required from this lane.

The panel lets the player choose a published district as the seat to file for. That choice is not home-membership evidence. Optional exact call if the panel is not mounted:

```ts
fileForOffice(world, personId, bindingForDistrict(identity));
```

`fileForOffice(world, personId)` remains valid where no sourced district-residence rule applies (Kentucky). Alaska still refuses until an explicit district identity **and** a World-established membership interval exist. Choosing District 2 and waiting does not satisfy that.

## What this does not do

- Interior points are not boundaries or home membership.
- A selected district is not proved residence in that district.
- Old saves are not backdated.
- Election results are not forced.
- A canonical home-to-district geography join is not implemented; unknown stays unknown.
- Ordinary player-route visual acceptance remains A's after mount.

## Proof owned here

Focused tests in `src/districts/query.test.ts` and `src/presentation/districts13.test.ts`: refusal boundaries, interrupted residence, old-save UNKNOWN, picker-is-not-membership, World-established qualification connection. Independent review of the repaired boundary is distinct from this author run.
