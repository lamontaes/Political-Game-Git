# Mount expectations for the Places and Municipal leaves

Published early, as PARALLEL11 asks, so E and F can build against a stated
interface instead of guessing at one. This is UI (#144) telling the leaf owners
what it will call and what it promises; it is not a design for their component.

Branch `codex/ui-core-release-transfer`. These expectations are written against
its current head and will be honoured as it advances.

## Who owns what

UI alone edits `src/player/PlayerGame.tsx`, `src/player/ShellNav.tsx`,
`src/player/shell.css`, `src/player/player.css` and the person/scene renderer.
A leaf that needs a change in any of those asks for it rather than making it;
a patch that edits them will be taken as the request, not as the integration.

E owns `PlacesWorkspace` and its read-model, stylesheet and tests.
F owns `MunicipalWorkspace.tsx` / `.css` and its directory read-model and tests.
D owns the News panel and its search module.

## What a workspace receives

Both leaves are mounted the way every other workspace already is: UI resolves
the surface, renders the component inside the shell frame, and passes the World
and the current person plus explicit callbacks. Nothing is imported by the leaf
from the shell.

```ts
interface LeafWorkspaceProps {
  readonly world: World;
  readonly personId: EntityId;
  /** Open any canonical entity by id. Never travels, never advances time. */
  readonly onOpenEntity: (ref: EntityRef) => void;
  /** Pin or unpin a reference the shell already understands. */
  readonly onTogglePin: (ref: EntityRef) => void;
  /** Apply a canonical writer's result. UI re-renders from the new World. */
  readonly onWorldChange: (world: World) => void;
}
```

`EntityRef` and `EntityId` come from `src/simulation`. `onOpenEntity` is the
same callback the dossier and the pin rail already use, so a person id opens the
person the player chose rather than a projection's idea of who was meant.

## What UI promises

- The component is rendered inside the existing shell frame, with Back, the pin
  rail and the navigation already around it. A leaf adds no navigation of its
  own and no second root.
- `onWorldChange` is the only way a leaf changes anything. UI does not write the
  World on a leaf's behalf and does not interpret its arguments.
- Reading is free: opening the surface, inspecting, searching and paging do not
  advance the clock, mint an event or move anybody. UI holds this for the shell
  and expects the leaf to hold it inside its own component.

## What UI expects back

- A default export or a named export of the component, and a pure projection
  function it can call without a DOM.
- No import of `PlayerGame`, `ShellNav`, `useShell` or the shared stylesheets.
- Styles scoped to the feature's own stylesheet and class prefix. UI will not
  take a change to `player.css` or `shell.css` from a leaf branch.
- Props stable, or a compatible addition documented in the pull request so UI
  can update the call site in the same pass.

## How a leaf arrives

Open one pull request against `codex/ui-core-release-transfer`. UI merges it
with an ordinary history-preserving merge, applies the mount, regenerates the
prose corpus on the combined tree with the sanctioned commands, and then runs
the leaf's own normal route in the mounted game before calling it done. An
unapplied patch is not an integration and will not be reported as one.

If a leaf needs a root change to be reachable at all, say so in the pull
request with the exact lines. UI will make that change on this branch.

## Already mounted

`MunicipalWorkspace` and `PublicInformationPanel` are already mounted in
ordinary play on this branch, so F and D prove their journeys through the
normal route and do not need a fixture endpoint to stand in for it. Places has
no mount yet; UI will add it when E's component lands.
