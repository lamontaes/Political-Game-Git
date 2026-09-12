# Local development art preview

A development-only mode that composes the ordinary playable shell against the
banked candidate review art instead of the released production art, so an owner
can look at what the art bank actually contains before anything is promoted.

It adds no renderer, no world, no appearance system and no art library. It
selects different libraries for the compositor that is already there.

## Turning it on

```
npm run dev
# then open with the opt-in on the address
http://localhost:5173/?art-preview=candidate
```

Nothing else enables it. A different value, a different parameter name, or a
production build all resolve to the ordinary production mode.

## What keeps it contained

- **It cannot turn on in a shipped build.** The mode is read from the address
  and then gated on `import.meta.env.DEV`, which Vite replaces with a literal
  `false` when it builds for production, so no address can select candidate art
  in anything a player runs. This is a claim about what draws, not about what is
  bundled: the review libraries were already reachable from the existing
  character-proof route, and this changes neither what ships nor what is
  eligible.
- **It promotes nothing.** The review libraries are the existing in-memory lift
  of a separate candidate registry, written back nowhere. No eligibility flag,
  manifest field or catalog generation changes, and the production libraries
  contain none of the components the preview draws.
- **It writes into its own saved-game database.** Opting into candidate pixels
  must not quietly edit a life played on production art, so the preview's lives
  live in a separate IndexedDB database.
- **It will not put an adult body on a child.** The character component system
  carries no age class, and every banked review body is an adult body, so the
  preview refuses anybody under `PREVIEW_MINIMUM_AGE` and names the coverage it
  is missing rather than dressing them.

## What it shows today, and what it cannot

Measured by `scripts/dev-lab/trace-candidate-coverage.test.ts` on this revision:

|                          | production libraries            | candidate review libraries    |
| ------------------------ | ------------------------------- | ----------------------------- |
| adult portrait           | refused, all layers fixture art | complete, zero fixture layers |
| adult standing in a room | refused, all layers fixture art | drawable art                  |
| adult seated in a room   | refused                         | no seated pose art is banked  |
| child, any surface       | refused                         | refused, deliberately         |

Two separate things stop a person appearing, and only one of them is about art.

**Release eligibility.** Every component in the released production library is
fixture regression art, which the resolver will not present as a likeness. This
is the refusal the preview exists to work around, and lifting it is an art
decision for the owner, not a code change.

**Scene calibration.** Every residence scene in the registry declares no floor
calibration and no standard body width. Placement is derived from those
measurements, so an uncalibrated room refuses every figure in production
regardless of what art is released — releasing a body master would still not
put anybody in the player's living room. That is scene authoring work measured
from the plate, and nothing in the code may invent it. The preview proceeds
anyway and carries `scene-declares-no-floor-calibration` out on the person, so
a wrongly-sized figure is visible and rejectable rather than silently absent.

## The refusals are readable now

Every way of not drawing somebody used to collapse into the same two initials
with nothing to inspect. The reason is carried out instead:

- `PlacedScenePerson.artRefusal`, surfaced as `data-art-refusal` on the scene
  person token;
- `data-refusal` on `person-portrait`, carrying which of the resolver's reasons
  applied;
- `resolvePersonPortrait`'s `appearance-unresolvable` now appends the render
  planner's own message rather than discarding it in a bare `catch`.

These are development diagnostics. None of them is player-facing copy.

## Related

- [Scene Authoring Pipeline](scene-authoring-pipeline.md)
- `src/presentation/art-preview.ts`
- `tests/art-preview.test.ts`
