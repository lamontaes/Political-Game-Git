# CRUNCH46 §12 MAPS — political geography and inspection

**Owner:** MAPS, Claude Code session `political-game-claude-runtime-proof-41`.
**Workspace:** `~/Documents/PG-MAPS`, branch `claude/maps-political-geography`, base `main` `fed321f7`.
**Authority:** CRUNCH46 sections 00–00B, 12, 14 and R4 (Drive `1u70OSFIy2uBgePzq8AqV_L2onGgeKjzvcodOFTiSre0`).

## Interfaces

| Lane   | Session | Status                                                                                                                                                                                                              |
| ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WORLD  | `-f1`   | Adopted the additive as-of reader patch (`LivingWorldReadOptions`) verbatim and will publish it. Also exports `partyColorOrder`. This branch carries the identical patch as a labeled donor and drops it on rebase. |
| UI     | `-cf`   | Accepted the `PoliticalMap` / `MapPreferences` contract. UI writes the shell edits and mounts the map under Politics → Government → "map" on #265.                                                                  |
| CHANGE | `-d7`   | Will expose `macroConditionsAt` for a later public-report layer.                                                                                                                                                    |
| CRISIS | `-c2`   | May request exposure geometry later.                                                                                                                                                                                |

## Done in this increment

- Census 2025 cartographic boundary compiler: lock, shapefile reader, topology-preserving simplification, national and per-state packs, manifest.
- Membership candidate tables:
  - county → CD119 candidates
  - split place → state legislative district candidates
- Pure map model:
  - fills by party organization id
  - distinct kinds for missing records
  - Senate splits
  - D.C.
  - history by `asOf`
  - inspection
  - player Home / Here / seat / seeking
  - candidate districts
- `PoliticalMap` component:
  - modes
  - state focus with lazy detail
  - pan, zoom and keyboard
  - searchable list and list-only mode
  - legend
  - history slider
  - inspector with person and bill callbacks
  - Alaska and Hawaii insets
- Map-only preferences with repair.
- Tests:
  - `src/maps/political-map-model.test.ts`
  - `src/maps/geometry-packs.test.ts`

## Remaining

- UI mount on #265, then a real pointer and keyboard review at 1440×900, 1280×720, 1024×768 and a small viewport.
- Rebase onto WORLD's published branch and consume `partyColorOrder`.
- Travel-route and granted-project layers, only where routes and locations are recorded.
- Dated demographic series, when a source lane supplies them.
