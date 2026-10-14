# Seat slots

Painted people for every seat in twelve chamber and meeting-room paintings. Each folder is one place painting from `art/backdrops/` (same name). Firefly painted people into the real chairs of the empty room, a few at a time and far apart; each person was cut out alone and filed under the seat they sit in.

To draw a room: draw the place painting, then for each occupied seat draw one of its people, lowest `bottom` last. The cut-outs include only what is visible from the camera, so a chair back or desk in front of a person is already left out of the cut-out and the room's own furniture shows through.

## Files

- `<place>__seats__<light>.png`: one sprite sheet per light the place painting comes in (`midday`, `morning`, `night`, `rain`). Every sheet has the same layout.
- `seats.json`:
  - `place`, `plate` (the midday painting), `width` and `height` (1672 × 941, the painting size the positions use).
  - `sheets`: the sheet file for each light.
  - `seats`: one entry per seat, with `id` and `head` (the head point on the painting) and `variants`, the people who can sit there. Each variant has:
    - `rect`: `[x, y, w, h]` of the cut-out in every sheet.
    - `at`: for each light, the `[left, top]` where the cut-out goes on that light's painting.
    - `bottom`: the cut-out's lowest row on the painting, for drawing order.
    - `activity`: `plain` (hands resting and empty, the default) or `reading` (holding papers; use only when the simulation has the person reading). One county commissioner is `talking`.

## Counts

| Place                                  | Seats | People |
| -------------------------------------- | ----: | -----: |
| `council-chamber`                      |    26 |    117 |
| `council-chamber-large`                |    25 |    106 |
| `council-chamber-small`                |    20 |     65 |
| `county-commission`                    |    17 |     68 |
| `county-commission-rural`              |    12 |     48 |
| `public-meeting-room`                  |    14 |     48 |
| `school-board-room`                    |     7 |     27 |
| `state-house-chamber`                  |    18 |    129 |
| `state-legislative-chamber-bicameral`  |    13 |     70 |
| `state-legislative-chamber-unicameral` |     8 |     64 |
| `us-house-floor`                       |    26 |    126 |
| `us-senate-floor`                      |    48 |    160 |

## Rebuilt slots

`school-board-room` uses seven fixed chair anchors and 27 reviewed people, including four native-generated replacements. Its `chairs.json` records the empty-painting geometry; `report.json` records rejections. Each seat and variant includes `chair`, and variants also retain their own `head`. Other rooms retain their previous packed artwork until their replacement sheets pass visual review.

`public-meeting-room`: 14 fixed occupied chair/bench positions, 48 reviewed variants. Each slot has at least three variants. Its sheets and full, third, and available night renders were inspected.

`county-commission`: 17 fixed occupied chair/bench positions, 68 reviewed variants. Each slot has at least three variants. Its sheets and full, third, and available night renders were inspected.

`county-commission-rural`: 12 fixed occupied chair/bench positions, 48 reviewed variants. Each slot has at least three variants. Its sheets and full, third, and available night renders were inspected.

`council-chamber-small`: 20 fixed occupied chair/bench positions, 65 reviewed variants. Each slot has at least three variants. Its sheets and full, third, and available night renders were inspected.

`state-legislative-chamber-unicameral`: 8 fixed occupied chair/bench positions, 64 reviewed variants. Each slot has at least three variants. Its sheets and full, third, and available night renders were inspected.
