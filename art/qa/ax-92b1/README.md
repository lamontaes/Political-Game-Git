# AX-92B1 — existing park and press-room asset intake

Two existing environment sources, taken through the accepted JPEG/environment
intake path. Nothing was generated, nothing was released, and neither room
became reachable in play.

## The two sources, and only these two

|                     | Park / community pavilion                                                 | Press briefing room                                                |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Drive id            | `1SVG_lRUgoMJTmyreTsmhLJB6roJitFr1`                                       | `1SPvoi-0L7T4mK156yFg1dpOW82ggb4J6`                                |
| Drive title today   | `OCD_CANDIDATE_SCENE_PARK_COMMUNITY_PAVILION_5504x3072_01.JPG`            | `OCD_CANDIDATE_SCENE_PRESS_BRIEFING_ROOM_5504x3072_01.JPG`         |
| Former title        | `IMG_5204.JPG`                                                            | `IMG_5202.JPG`                                                     |
| Repository bytes    | `art/references/candidates/recent-drive-sweep/source-images/IMG_5204.JPG` | `.../IMG_5202.JPG`                                                 |
| sha256              | `935ce236f421786061677da8f017fc775fab50e47693d7f611c916920f22f59f`        | `e16e1b0b0c5cd93a6254ac1b1145f5439351a4e6b8530d739844bd62e973d065` |
| Bytes               | 3 464 125                                                                 | 3 068 797                                                          |
| Measured from bytes | 5504×3072 JPEG                                                            | 5504×3072 JPEG                                                     |
| Asset id            | `env_park_community_pavilion_5504x3072_01`                                | `env_press_briefing_room_5504x3072_01`                             |

## Lifecycle, after this run

| State                                  | Park               | Press room         |
| -------------------------------------- | ------------------ | ------------------ |
| exists                                 | yes                | yes                |
| ingested (bytes in repository)         | yes                | yes                |
| measured through environment intake    | **yes — new here** | **yes — new here** |
| candidate-registered in the asset bank | **yes — new here** | **yes — new here** |
| human-approved                         | no                 | no                 |
| released                               | no                 | no                 |
| production consumer present            | no                 | no                 |

## Is either background reachable in normal play?

**No.** Neither the park nor the press briefing room is reachable in normal
play, and this run did not change that. Intake measures a picture and records
where it came from. It does not create travel, an event, a schedule, or a
place, and it is not an approval. Release is a separate question from
reachability, and both are still open.

## Files

- `../../intake/environment-batch-ax-92b1.request.json` — the declaration intake reads.
- `../../intake/ax-92b1/environment-intake-report.json` — deterministic intake evidence.
- `../../intake/ax-92b1/asset-bank.json` — the seeded bank, every judgement unassessed.
- `../../intake/ax-92b1/asset-bank-observed.json` — the same bank with the
  observation-class judgements filled in by a development-time multimodal pass
  (`assessedBy: external-multimodal-qa`). Every acceptance-class judgement is
  still `unassessed`, because each is a human gate.
- `release-review.html` — the human release-review artifact: both plates
  side by side at the 1376×768 plate scale, with every missing decision named.
- `lifecycle_matrix.json` — the exact-id lifecycle matrix and the consumer seam.

## Commands

```
npm run intake:environment -- art/intake/environment-batch-ax-92b1.request.json --out art/intake/ax-92b1
npm run bank:art -- validate art/intake/ax-92b1/asset-bank-observed.json
npx vitest run scripts/art-asset-factory/ax-92b1-park-press-intake.test.ts
npm run validate
```

## What was deliberately not done

No new art. No derivative raster, no tier ladder, no scene scaffold, no scene
spec, no registry entry, no consumer. No rename of preserved source bytes. No
edit to `art/manifest/*`, `art/requests/*`, or the shared global QA reports —
those are another writer's merge cargo, so every output here is task-scoped.
No other Drive source was ingested, and #79, #89 and #90 were not touched.
