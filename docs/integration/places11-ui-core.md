# Places11 UI-core integration

Leaf branch: `cursor/places11-9f91` (from `codex/ui-core-release-transfer` at `f92fb4f8`).

Apply `docs/integration/places11-ui-core.patch` on UI144 (`codex/ui-core-release-transfer`) to mount the feature-local workspace.

## Mount contract

`PlacesWorkspace` accepts:

- `world`, `personId`, `onWorldChange` — canonical World ownership stays in PlayerGame
- `onClose` — shell Back/Close
- `transitionHandlers` — campaign-aware registry (same as MunicipalWorkspace)
- `onInspectGovernment(governmentKey)` — opens `{ kind: "government", id }` via `open-entity`; inspection only, no travel

Navigation adds surface `"places"` with test id `nav-places`.

## Proposed integration proof

With the patch applied:

```bash
npm run test -- src/presentation/player-places.test.ts
npm run test:e2e -- tests/e2e/places11.spec.ts
```

Screenshots for the leaf PR were captured on the patched composition at representative desktop and narrow viewports.
