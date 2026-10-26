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
| `council-chamber-small`                |    22 |     79 |
| `county-commission`                    |    17 |     87 |
| `county-commission-rural`              |    12 |     33 |
| `public-meeting-room`                  |    15 |     74 |
| `school-board-room`                    |     8 |     50 |
| `state-house-chamber`                  |    18 |    129 |
| `state-legislative-chamber-bicameral`  |    13 |     70 |
| `state-legislative-chamber-unicameral` |    14 |     80 |
| `us-house-floor`                       |    26 |    126 |
| `us-senate-floor`                      |    48 |    160 |
