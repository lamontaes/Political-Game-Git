# Municipal11 leaf mount contract (PR159)

For UI144 integration by Claude A. This leaf is already mounted via
`municipalSurface()` in `PlayerGame.tsx`; no root edits are required for basic
absorption.

## Branch

- `cursor/municipal11-add9` targeting `codex/ui-core-release-transfer`

## Component

`MunicipalWorkspace` (`src/player/MunicipalWorkspace.tsx`)

### Existing props (unchanged)

| Prop                    | Type                                      | Notes                                |
| ----------------------- | ----------------------------------------- | ------------------------------------ |
| `world`                 | `World`                                   | Required                             |
| `onWorldChange`         | `(world: World) => void`                  | Required                             |
| `transitionHandlers`    | `FutureTransitionHandlerRegistry`         | Optional; campaign election registry |
| `renderVenue`           | `(world, activityId, venue) => ReactNode` | Optional; venue completion status    |
| `openGovernmentKey`     | `string`                                  | Optional; shell pin/link target      |
| `isPinnedGovernment`    | `(key: string) => boolean`                | Optional                             |
| `onTogglePinGovernment` | `(key: string) => void`                   | Optional                             |

### New optional prop

| Prop           | Type                           | Notes                                                                                                                                                                                                    |
| -------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onOpenPerson` | `(personId: EntityId) => void` | **Not wired in this leaf.** A should pass `openPerson` from the shell when absorbing the leaf so Known people rows with seated officeholders become navigable. When omitted, names render as plain text. |

## Shell wiring example

```tsx
<MunicipalWorkspace
  world={session.world}
  onWorldChange={onWorldChange}
  transitionHandlers={createCampaignElectionTransitionRegistry()}
  {...(openGovernmentKey ? { openGovernmentKey } : {})}
  isPinnedGovernment={(key) => pinnedRef({ kind: "government", id: key })}
  onTogglePinGovernment={(key) => togglePin({ kind: "government", id: key })}
  onOpenPerson={openPerson}
  renderVenue={...}
/>
```

## Selection contract

- `openGovernmentKey` from a pin opens that government until the player picks
  another from the dropdown (`userOverride`).
- A later external pin clears the override and follows the new key.
- Inspection never changes residence or standing; only `municipalStanding` from
  the world applies.

## Styles

Feature-local only: `src/player/MunicipalWorkspace.css`
