# Scene pictures: before and after

Place: Camp Verde, Arizona (US-AZ, 0409690), run seed `proof-seed-1`, place seed `92cc3914393b835045618cc107dc9e801ef82afa4ad28d2b9dee86b0bdceaec7`, midday, built with `buildBenchWorld`.

`before-after.png` shows the backdrop each scene resolves to, left before this change and right after, taken from the same lookup the story scene uses. It is the picture the scene's room is drawn in, not the whole play screen (the people strip and the talk box are unchanged).

| Scene                                   | Before                                                 | After                                                                             |
| --------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| door-ask at a resident's home           | `house-suburban-living` (the player's own living room) | `door-knocking-suburban` (the Southwest regional painting at the resident's door) |
| floor-debate at a council member's seat | `community-room`                                       | `council-chamber-small` (the body's own room)                                     |
| desk-visit in a mayor's office          | `city-hall-hallway`                                    | `mayor-office`                                                                    |

## In the running game

- `play-door-scene.png`: a door scene in play. A candidate for township board in Spring Lake Colony, South Dakota (life seed `86f7269a-2642-4b18-99ef-02c269385afc`) knocks on Patrick Sexton's door on January 2, 2026, 10 AM; the scene is drawn on the resident's porch (`door-knocking-suburban`) where it was drawn in the player's own home before.
- `play-seat-floor-debate.png`: a floor-debate scene in play. A state representative in Misquamicut, Rhode Island (life seed `8992f63d-43a6-4004-8ec3-315c7e499ff3`), Advanced start, on February 11, 2025: the scene is drawn in the state house chamber (`state-house-chamber`, the body's own room) where it was drawn in the community room before.

Both were taken at 1440x900 with the play-walk scripts on this branch's bench.
