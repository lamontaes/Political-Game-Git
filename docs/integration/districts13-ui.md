# DISTRICTS13 → UI / LAND owner (task A)

Recipient: LAND13 / UI composition owner. Builder: DISTRICTS13. This is a feature-local contract. Do not treat it as PlayerGame or global-navigation ownership.

Base: current `main` at the DISTRICTS13 publication SHA. Fiscal query/work files are pinned from `codex/fiscal-activate1` (`dee56eb2`) so the earned-seat consumer can be proved here. If FISCAL151 lands first, keep one copy of `src/fiscal-authority/query.ts`, `src/presentation/fiscal-authority-work.ts`, and `src/presentation/legislative-fiscal-proposal.ts`.

## Mount

Import `DistrictResidencePanel` from `src/player/DistrictResidencePanel.tsx` and render it beside the existing campaign workspace. It already uses `world`, `personId`, and `onWorldChange`. No App/PlayerGame/global-navigation edits are required from this lane.

Optional exact call for A if the panel is not mounted and filing must carry a binding:

```ts
fileForOffice(world, personId, bindingForDistrict(identity));
```

`fileForOffice(world, personId)` remains valid where no sourced district-residence rule applies (Kentucky). Alaska still refuses until an explicit district identity and elapsed interval exist.

## What this does not do

- Interior points are not boundaries or home membership.
- Old saves are not backdated.
- Election results are not forced.
- Ordinary player-route visual acceptance remains A's after mount.

## Proof owned here

Focused tests in `src/districts/query.test.ts` and `src/presentation/districts13.test.ts`: refusal boundaries, interrupted residence, old-save UNKNOWN, stable replay, elapsed Alaska filing, and a labeled diagnostic earned-seat → fiscal Work open. The fiscal production corpus is still FISCAL151's; the Work opener is exercised with an honest UNESTABLISHED query when that corpus is absent.
