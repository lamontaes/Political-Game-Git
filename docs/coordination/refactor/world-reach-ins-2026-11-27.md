# Places and the clock: reach-ins into its non-entry files (World, Nov 27, 2026)

The CTO's 2:16 a.m. addition to World's item 1: count the reach-ins into the clock-places family's non-entry files, then route them through its entries with item 2.

**Re-run:** `node --import tsx scripts/world/reach-ins.ts clock-places` (add `--md` for this table; another family id works too). It reads `tests/guards/families.json` and every import in `src/`, and changes nothing.

**Counted on train/nov27-a at the head of this branch:** 7 non-entry files of the family are imported from outside it, by 65 files, of which 10 are not tests. The families guard counts only the non-test files, so the real baseline is the 10; the tests' 55 are noted so a door can be checked against them.

| Non-entry file of clock-places       | Importers outside it | Of them tests |
| ------------------------------------ | -------------------: | ------------: |
| `src/core2/player-v1.ts`             |                   27 |            23 |
| `src/core2/calendar.ts`              |                   13 |            13 |
| `src/core2/modules/world-metrics.ts` |                    9 |             8 |
| `src/core2/player-stops-v1.ts`       |                    7 |             5 |
| `src/core2/modules/disasters.ts`     |                    5 |             4 |
| `src/core2/coarse-place.ts`          |                    3 |             1 |
| `src/core2/modules/climate.ts`       |                    1 |             1 |

## The ten non-test importers (the baseline's share)

| Non-entry file                       | Imported by (not a test)                                                                    | Whose file              |
| ------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------- |
| `src/core2/player-v1.ts`             | `src/bench/m0-check.ts`, `src/bench/places.ts`, `src/bench/player.ts`, `src/bench/scene.ts` | Screens' (the bench)    |
| `src/core2/modules/world-metrics.ts` | `src/core2/modules/outcome-web.ts`                                                          | Lawmaking's             |
| `src/core2/player-stops-v1.ts`       | `src/core2/modules/office-day.ts`, `src/director/ledger.ts`                                 | Offices' and Story's    |
| `src/core2/modules/disasters.ts`     | `src/core2/modules/executive.ts`                                                            | Offices'                |
| `src/core2/coarse-place.ts`          | `src/core2/modules/voting.ts`, `src/core2/office-day-federal-president.ts`                  | Elections' and Offices' |

`calendar.ts` and `modules/climate.ts` are imported only by tests.

## What this changes

Nothing yet. Routing each import through an entry is item 2's door work: where a file is the family's public face (the player's state, the stops, the metrics), it becomes an entry in `tests/guards/families.json` in the same pull request that moves its readers' imports, and the families baseline lowers by the count above. The consumers switch their own files, as the other maps do. The player files are World's (CTO, 2:16 a.m.), so `player-v1.ts` and `player-stops-v1.ts` are doors World builds first.
