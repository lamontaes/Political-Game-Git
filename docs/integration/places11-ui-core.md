# Places11 UI-core integration

Leaf branch: `cursor/places11-9f91` (base reference `f92fb4f8`; mount patch targets current UI144 `07b4d4cf`).

Apply `docs/integration/places11-ui-core.patch` on `codex/ui-core-release-transfer`. **A alone commits the mount**; this leaf keeps the patch as the integration request.

Authoritative callback shape: `docs/integration/ui-people11-leaf-mount-contract.md` on UI144.

## Mount contract (`PlacesWorkspaceProps`)

Compatible with `LeafWorkspaceProps` in that document (`EntityRef` there = `PlacesEntityRef` here):

- `world`, `personId`
- `onOpenEntity(ref)` — inspect opens `{ kind: "government", id }`; never travels or advances time
- `onTogglePin(ref)` — accepted for shell parity; Places v1 does not render pin controls
- `onWorldChange(world)` — sole World mutation path for travel/attend actions
- `transitionHandlers?` — documented compatible addition for campaign-aware canonical writers

The shell frame supplies Back/Close; the leaf does not mount its own navigation.

Inner panel test id: `places-panel`. Frame test id: `places-workspace`.

## Proposed composition proof (not production integration)

Label any browser or screenshot evidence taken with the patch applied as **proposed composition**, not mounted UI144, until A merges and commits the mount.

With the patch applied on a disposable checkout of UI144 + this leaf:

```bash
npm run test -- src/presentation/player-places.test.ts
npm run test:e2e -- tests/e2e/places11.spec.ts
```

Normal-player reachability is not claimed green on the unmounted leaf donor alone.
