# Seat slots

Painted people for twelve chamber and meeting-room backdrops. This rebuild reuses the existing occupied-seat inventory, matches it to chairs and benches in the empty paintings, and merges duplicate positions. It does not add every visible gallery chair. Nothing in the game draws these assets yet.

Draw the empty backdrop, choose one variant per occupied chair, and draw in ascending `bottom` order. Furniture occlusion is already in each sprite's alpha. An empty room needs only its backdrop.

## Files and coordinates

Each room contains `chairs.json`, `report.json`, `seats.json`, furniture masks, and `<place>__seats__<light>.png`. Coordinates use the 1672 × 941 backdrop. Available lights follow the room's backdrops; the rural county room has only midday.

`chairs.json` records fixed chair IDs, seat points, approximate boxes, depth groups, facing direction, and the empty-painting annotations used for occlusion. Its method describes detector results and manual annotations. Bench positions can share a detected bench while retaining distinct chair IDs.

`seats.json` keeps `place`, `plate`, `width`, `height`, `sheets`, and `seats`. Each seat has `id`, `chair`, `head`, and `variants`. Each variant keeps `rect` (`[x,y,width,height]` in the atlas), `at` (placement per light), `bottom`, and `activity`, and adds `chair` and its own `head`. Atlas layouts match across lights. `activity` currently defaults to `plain`; it is not a guarantee of empty hands or a complete reading/talking classification.

Every included chair has at least three variants. Source masks must be one connected person before room furniture hides parts of that person. Visible parts separated by furniture remain one sprite; they never become independent slots.

## Counts

| Room                                   | Chair slots | People | Rejected |
| -------------------------------------- | ----------: | -----: | -------: |
| `council-chamber`                      |          26 |    110 |      137 |
| `council-chamber-large`                |          23 |     82 |      159 |
| `council-chamber-small`                |          20 |     65 |      111 |
| `county-commission`                    |          17 |     68 |      104 |
| `county-commission-rural`              |          12 |     48 |       64 |
| `public-meeting-room`                  |          14 |     48 |       86 |
| `school-board-room`                    |           7 |     27 |      139 |
| `state-house-chamber`                  |          17 |    101 |      225 |
| `state-legislative-chamber-bicameral`  |          10 |     53 |      228 |
| `state-legislative-chamber-unicameral` |           8 |     64 |      335 |
| `us-house-floor`                       |          18 |    133 |      283 |
| `us-senate-floor`                      |          32 |    148 |      305 |

Each room's `report.json` contains rejection counts by reason. Labeled sheets, their source indexes, and full/third/night previews are in `docs/handoff/seat-slots/`. See its README for rebuilding and review limits.
